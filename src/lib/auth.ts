import { cookies } from "next/headers";
import { hashCodigo, normalizarCodigo } from "./ativacao";
import { fold } from "./busca";
import { alunoPorId } from "./dados";
import { logger } from "./debug";
import { ipDoCliente, limitar, limparLimite } from "./rate-limit";
import { hashSenha, HASH_FANTASMA, verificarSenha } from "./senha";
import { DOMINIO_EMAIL_ESCOLA } from "./limites";
import { sanitizarEmail, sanitizarTexto } from "./seguranca";
import {
  abrirAssinado,
  assinar,
  COOKIE_ADM,
  crachaAdm,
  opcoesCookie,
  TRINTA_DIAS,
} from "./sessao";
import { slugUnico } from "./slug";
import { clienteAdmin } from "./supabase/admin";
import type { UsuarioSessao } from "./tipos";
import { validarUsername } from "./username";

export const COOKIE_USUARIO = "sesi.usuario";

/** Validade do token de sessão, em segundos. Casa com o `maxAge` do cookie. */
const VALIDADE_SESSAO_S = TRINTA_DIAS;

/**
 * Cria token de sessão assinado, com emissão e expiração dentro do payload.
 *
 * O `exp` existe porque o `maxAge` do cookie é imposto pelo **navegador**, e o
 * navegador não é confiável: sem checar no servidor, um token copiado vale
 * para sempre, mesmo depois de o cookie "expirar".
 */
export function criarTokenSessao(dados: UsuarioSessao): string {
  const agora = Math.floor(Date.now() / 1000);
  const payload = { ...dados, iat: agora, exp: agora + VALIDADE_SESSAO_S };
  const base64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return assinar(base64, "usuario");
}

/** Abre e decodifica a sessão a partir do cookie assinado */
export async function obterSessao(): Promise<UsuarioSessao | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_USUARIO)?.value;
  if (!token) return null;

  const base64 = abrirAssinado(token, "usuario");
  if (!base64) return null;

  try {
    const json = Buffer.from(base64, "base64url").toString("utf-8");
    const payload = JSON.parse(json) as UsuarioSessao & { iat?: number; exp?: number };

    const agora = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== "number" || payload.exp <= agora) return null;
    // Emitido no futuro = relógio errado ou payload forjado.
    if (typeof payload.iat !== "number" || payload.iat > agora + 60) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * As regras de senha, num lugar só — e o mínimo é 8.
 *
 * Uma regra, não uma por tela: o cadastro e a ativação chamam esta função, e a
 * troca de senha (aba Conta) exige o mesmo 8 na mão. Já divergiram uma vez (o
 * cadastro aceitava 4 enquanto a troca exigia 8), e quem se cadastrou com senha
 * curta não conseguia nem repetir o próprio padrão depois.
 */
function problemaDaSenha(senha: string, username: string): string | null {
  if (senha.length < 8 || senha.length > 100) {
    return "A senha deve ter entre 8 e 100 caracteres.";
  }
  if (senha.toLowerCase() === username) {
    return "A senha não pode ser igual ao nome de usuário.";
  }
  return null;
}

/**
 * Monta a sessão a partir da linha de `usuarios`, já com os dados do aluno.
 *
 * Serve aos dois caminhos que emitem sessão para um aluno: o login e a ativação
 * por código.
 *
 * O e-mail ECOA o que está em `alunos.email` — não é calculado. Antes este
 * trecho fabricava um endereço (`username@aluno.sesisp.org.br`, que nem é o
 * domínio da escola) para todo mundo, com um caso especial chumbado para o
 * `theo1234`. O aluno via no perfil um e-mail que não existia.
 */
async function sessaoDe(usuario: {
  id: string;
  username: string;
  role: string;
  aluno_id: string | null;
}): Promise<UsuarioSessao> {
  let nome = usuario.username;
  let sala: string | null = null;
  let email: string | null = null;
  let aprovado = true;

  if (usuario.aluno_id) {
    const aluno = await alunoPorId(usuario.aluno_id);
    if (aluno) {
      nome = aluno.nome;
      email = aluno.email;
      aprovado = aluno.aprovado;
      if (aluno.sala_id) {
        const { data: s } = await clienteAdmin()
          .from("salas")
          .select("nome")
          .eq("id", aluno.sala_id)
          .maybeSingle();
        if (s?.nome) sala = s.nome;
      }
    }
  }

  return {
    id: usuario.id,
    username: usuario.username,
    role: usuario.role as UsuarioSessao["role"],
    alunoId: usuario.aluno_id,
    nome,
    sala,
    email,
    aprovado,
  };
}

/** Realiza login com username e senha */
export async function autenticarUsuario(
  usernameBruto: string,
  senhaBruta: string,
): Promise<{ ok: boolean; mensagem?: string; usuario?: UsuarioSessao }> {
  const username = usernameBruto.trim().toLowerCase();
  const senha = senhaBruta.trim();

  if (!username || !senha) {
    return { ok: false, mensagem: "Informe o usuário e a senha." };
  }

  // Duas chaves, porque elas barram ataques diferentes: por usuário protege a
  // conta (5 tentativas), por IP impede que alguém varra mil usernames sem
  // nunca estourar o limite de nenhum deles.
  const limit = await limitar(`login:${username}`, 5, 5 * 60 * 1000, 5 * 60 * 1000);
  if (!limit.permitido) {
    logger.warn("AUTH", `Tentativa de login bloqueada por rate limit para o usuário: ${username}`);
    const minutos = Math.ceil((limit.tempoRestanteMs ?? 60000) / 60000);
    return {
      ok: false,
      mensagem: `Muitas tentativas seguidas. Aguarde ${minutos} minuto(s) antes de tentar novamente.`,
    };
  }

  const ipLogin = await ipDoCliente();
  if (ipLogin) {
    const limiteIp = await limitar(`login-ip:${ipLogin}`, 20, 5 * 60 * 1000, 5 * 60 * 1000);
    if (!limiteIp.permitido) {
      logger.warn("AUTH", `Tentativa de login bloqueada por rate limit de IP (${ipLogin})`);
      return {
        ok: false,
        mensagem: "Muitas tentativas seguidas. Aguarde alguns minutos antes de tentar novamente.",
      };
    }
  }

  // Consulta no banco de dados com cliente administrativo isolado
  const db = clienteAdmin();

  let usuarioDb: {
    id: string;
    username: string;
    role: string;
    aluno_id: string | null;
    senha_hash: string;
  } | null = null;

  // 1. Busca direta por username
  const { data: usuarioDireto } = await db
    .from("usuarios")
    .select("id,username,role,aluno_id,senha_hash")
    .eq("username", username)
    .maybeSingle();

  usuarioDb = usuarioDireto;

  // 2. Se não achou e o input não tem @: tenta com o sufixo @estudante.sesisenai.org.br
  if (!usuarioDb && !username.includes("@")) {
    const comSufixo = `${username}@${DOMINIO_EMAIL_ESCOLA}`;
    const { data: uSufixo } = await db
      .from("usuarios")
      .select("id,username,role,aluno_id,senha_hash")
      .eq("username", comSufixo)
      .maybeSingle();
    if (uSufixo) usuarioDb = uSufixo;
  }

  // 3. Se não achou e o input tem @: tenta o prefixo local
  if (!usuarioDb && username.includes("@")) {
    const semSufixo = username.split("@")[0];
    const { data: uPrefixo } = await db
      .from("usuarios")
      .select("id,username,role,aluno_id,senha_hash")
      .eq("username", semSufixo)
      .maybeSingle();
    if (uPrefixo) usuarioDb = uPrefixo;
  }

  // 4. Se ainda não achou: pesquisa aluno com este e-mail na tabela alunos.
  //
  // `eq`, não `ilike`: o valor vem direto do que o aluno digitou, e ali `%` e `_`
  // são curinga — `%` deixa de significar "este e-mail" e passa a casar qualquer
  // linha, então o login procura numa conta que ninguém pediu. Não se perde nada
  // em caixa: `username` já chega minúsculo e a coluna só guarda minúsculo (o
  // sanitizador normaliza antes de gravar e o CHECK `alunos_email_forma` repete
  // a regra), então comparar exato é comparar o mesmo endereço.
  if (!usuarioDb) {
    const emailBusca = username.includes("@") ? username : `${username}@${DOMINIO_EMAIL_ESCOLA}`;
    const { data: alunoPorEmail } = await db
      .from("alunos")
      .select("id")
      .eq("email", emailBusca)
      .maybeSingle();

    if (alunoPorEmail?.id) {
      const { data: uAluno } = await db
        .from("usuarios")
        .select("id,username,role,aluno_id,senha_hash")
        .eq("aluno_id", alunoPorEmail.id)
        .maybeSingle();
      if (uAluno) usuarioDb = uAluno;
    }
  }

  if (!usuarioDb) {
    // Gasta o mesmo tempo do ramo de senha errada: sem isso, a diferença de
    // relógio conta quais usernames existem.
    await verificarSenha(senha, HASH_FANTASMA);
    logger.warn("AUTH", `Falha no login: usuário não encontrado (${username})`);
    return { ok: false, mensagem: "Usuário ou senha incorretos." };
  }

  const verificacao = await verificarSenha(senha, usuarioDb.senha_hash);
  if (!verificacao.ok) {
    logger.warn("AUTH", `Falha no login: senha incorreta para ${username}`);
    return { ok: false, mensagem: "Usuário ou senha incorretos." };
  }

  // Hash legado vira argon2id aqui, sem o usuário precisar fazer nada.
  if (verificacao.precisaRehash) {
    await db
      .from("usuarios")
      .update({ senha_hash: await hashSenha(senha) })
      .eq("id", usuarioDb.id);
    logger.info("AUTH", `Hash de senha atualizado para argon2id: ${username}`);
  }

  // Sucesso: reseta o contador da conta. O balde do IP fica de pé de propósito
  // — limpá-lo aqui deixaria quem conhece uma senha válida zerar o limite por
  // IP e seguir varrendo as outras contas.
  await limparLimite(`login:${username}`);
  logger.info("AUTH", `Usuário autenticado com sucesso: ${username} (role: ${usuarioDb.role})`);

  const sessao = await sessaoDe(usuarioDb);

  const jar = await cookies();
  jar.set(COOKIE_USUARIO, criarTokenSessao(sessao), opcoesCookie(TRINTA_DIAS));
  if (sessao.role === "super_adm") {
    jar.set(COOKIE_ADM, crachaAdm(), opcoesCookie(TRINTA_DIAS));
  }
  return { ok: true, usuario: sessao };
}

/** Cria um novo usuário e perfil de estudante no sistema */
export async function registrarUsuario(dados: {
  username: string;
  senha: string;
  nome: string;
  salaNome: string;
}): Promise<{ ok: boolean; mensagem?: string; usuario?: UsuarioSessao }> {
  const username = dados.username.trim().toLowerCase();
  const senha = dados.senha.trim();
  const nome = sanitizarTexto(dados.nome, 100);
  const salaNome = sanitizarTexto(dados.salaNome, 30);

  // Por IP, não global. O `cadastro:global` era 10/min compartilhado por todo
  // mundo, então um script derrubava o cadastro da turma inteira.
  //
  // 30 numa janela de 10 minutos é folgado de propósito: laboratório escolar
  // costuma sair por um NAT só, e 30 alunos criando conta na mesma aula não
  // podem ser confundidos com abuso. Um script sozinho fica em 3/min.
  const ipCadastro = await ipDoCliente();
  const limiteCadastro = await limitar(
    ipCadastro ? `cadastro:ip:${ipCadastro}` : "cadastro:global",
    30,
    10 * 60 * 1000,
  );
  if (!limiteCadastro.permitido) {
    return { ok: false, mensagem: "Muitos cadastros recentes. Aguarde alguns minutos." };
  }

  // Formato do username — a regra vive em `username.ts` porque o cadastro e a
  // troca de dados da conta precisam da mesma resposta, e porque o e-mail
  // institucional (`nome@estudante.sesisenai.org.br`) tem que passar.
  const problemaUsername = validarUsername(username);
  if (problemaUsername) {
    return { ok: false, mensagem: problemaUsername };
  }
  const problemaSenha = problemaDaSenha(senha, username);
  if (problemaSenha) {
    return { ok: false, mensagem: problemaSenha };
  }
  if (nome.length < 2) {
    return { ok: false, mensagem: "Informe o seu nome completo." };
  }
  if (!salaNome) {
    return { ok: false, mensagem: "Informe a sua sala (ex.: DSM3, 3ºA)." };
  }

  const db = clienteAdmin();

  // Verifica duplicidade de username
  const { data: jaExiste } = await db
    .from("usuarios")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (jaExiste) {
    return { ok: false, mensagem: "Este nome de usuário já está em uso." };
  }

  // O e-mail do aluno é o que ELE digitou — e só se for um endereço da escola.
  // Quem põe o e-mail institucional no campo de usuário já informou o dele;
  // quem digita só o nome de usuário não informou e-mail nenhum, e derivar um
  // (`nome@estudante.sesisenai.org.br`) gravava um endereço que não existe, que
  // a vitrine exibe como "E-mail institucional". Pior: quando o username tinha
  // dois `@` ou começava com `.`, o valor estourava o CHECK `alunos_email_forma`
  // (`014_dominio_email_br.sql`) e o cadastro inteiro morria em "Não foi
  // possível criar seu perfil agora". Sem endereço válido, grava `null` — ele
  // preenche o seu no editor.
  const emailAluno = sanitizarEmail(username);

  const { data: salasExistentes } = await db.from("salas").select("id,nome");
  const listaSalas = salasExistentes ?? [];
  let salaAchada = listaSalas.find(
    (s) => fold(s.nome as string) === fold(salaNome),
  );

  // Busca tolerante caso o aluno tenha digitado uma variação (ex: "dsm", "3a")
  if (!salaAchada && salaNome) {
    const termo = fold(salaNome);
    salaAchada = listaSalas.find(
      (s) => fold(s.nome as string).includes(termo) || termo.includes(fold(s.nome as string)),
    );
  }

  // Sem turma nenhuma não há o que escolher; com turma pedida que não casa, a
  // resposta é dizer QUAL foi o problema, não resolver por conta própria.
  //
  // Antes caía calado em "DSM3" (ou na primeira sala da lista) e matriculava o
  // aluno numa turma que ele não pediu — ele só descobriria no crachá, e o ADM
  // não ficava sabendo de nada. O `logger.warn` é o rastro para o ADM ver que
  // existe turma sendo digitada que o sistema não conhece.
  if (!salaAchada) {
    if (listaSalas.length === 0) {
      return {
        ok: false,
        mensagem: "Nenhuma turma cadastrada no sistema. Contate a administração.",
      };
    }
    logger.warn("AUTH", `Cadastro com turma inexistente: "${salaNome}"`);
    return {
      ok: false,
      mensagem:
        "Sala não encontrada. Confira o nome com o seu professor ou peça ao ADM para cadastrar a turma.",
    };
  }

  const salaId = salaAchada.id as string;
  const salaNomeFinal = salaAchada.nome as string;

  // Gera slug único
  const { data: todosAlunos } = await db.from("alunos").select("slug");
  const slugsExistentes = (todosAlunos ?? []).map((a) => a.slug as string);
  const slug = slugUnico(nome, slugsExistentes);

  // Cria o aluno no banco
  const { data: novoAluno, error: erroAluno } = await db
    .from("alunos")
    .insert({
      nome,
      slug,
      sala_id: salaId,
      email: emailAluno,
      bio: "Novo estudante no CRM SESI. Edite seu perfil para adicionar projetos e bio!",
      projetos: [],
      midias: [],
      // Nasce PENDENTE: este é o autocadastro anônimo, sem convite nem
      // confirmação de vínculo, então a vitrine não pode aceitar o que ele
      // mandar. Quem libera é o ADM (`aprovarAluno`, em `adm/acoes.ts`), e
      // as criações que JÁ SÃO dele — `criarAluno` e `importarLista` — ficam
      // com o default `true` da coluna. Importa porque a policy de leitura de
      // `alunos` é `using (true)`: este `false` é a única barreira que existe
      // (`011_moderacao_cadastro.sql`).
      aprovado: false,
    })
    .select("id")
    .single();

  if (erroAluno || !novoAluno) {
    // A mensagem do PostgREST fica no log. Ela ia crua para a tela de cadastro
    // (`estadoCadastro.mensagem` em `LoginTela`), ou seja: um anônimo lendo
    // `duplicate key value violates unique constraint "alunos_slug_key"`. O
    // nome de usuário já é checado antes; o que sobra aqui é corrida, e para
    // quem está se cadastrando a única frase útil é "tente de novo".
    logger.error("AUTH", "falha ao criar o aluno no cadastro", erroAluno);
    return {
      ok: false,
      mensagem: "Não foi possível criar seu perfil agora. Tente novamente em instantes.",
    };
  }

  // Cria o usuário
  const hash = await hashSenha(senha);
  const { data: novoUsuario, error: erroUsuario } = await db
    .from("usuarios")
    .insert({
      username,
      senha_hash: hash,
      role: "aluno",
      aluno_id: novoAluno.id,
    })
    .select("id,username,role,aluno_id")
    .single();

  if (erroUsuario || !novoUsuario) {
    // Mesmo motivo do aluno acima. O perfil já foi criado nesta altura, então
    // a frase não promete "nada aconteceu" — o ADM vê o perfil pendente e o
    // aluno pode tentar de novo com outro nome de usuário.
    logger.error("AUTH", "falha ao criar o usuário no cadastro", erroUsuario);
    return {
      ok: false,
      mensagem: "Não foi possível concluir o cadastro agora. Tente novamente em instantes.",
    };
  }

  const sessao: UsuarioSessao = {
    id: novoUsuario.id,
    username: novoUsuario.username,
    role: novoUsuario.role,
    alunoId: novoUsuario.aluno_id,
    nome,
    sala: salaNomeFinal,
    email: emailAluno,
    // O mesmo `false` do insert, e não um `true` de otimismo: este campo é o
    // retrato de `alunos.aprovado` dentro da sessão (`tipos.ts`), e o aluno que
    // acabou de se cadastrar está pendente até o ADM liberar em `aprovarAluno`.
    aprovado: false,
  };

  const jar = await cookies();
  jar.set(COOKIE_USUARIO, criarTokenSessao(sessao), opcoesCookie(TRINTA_DIAS));
  return { ok: true, usuario: sessao };
}

/**
 * Resgata o código de ativação: o aluno que JÁ está na planilha define a
 * própria senha e assume o perfil que o ADM importou.
 *
 * É o caminho que faltava. Sem ele, o aluno importado não tem como entrar no
 * próprio perfil, e o auto-cadastro dele cria uma SEGUNDA linha, pendente,
 * deixando a primeira órfã — cada cadastro novo sujava mais a base.
 *
 * A conta já existe com `senha_hash = '!bloqueado'`, que `verificarSenha`
 * recusa, então ela não autentica até este resgate. O código morre no primeiro
 * uso: o UPDATE abaixo exige que o hash ainda esteja na linha.
 */
export async function ativarAcessoComCodigo(dados: {
  codigo: string;
  username: string;
  senha: string;
}): Promise<{ ok: boolean; mensagem?: string; usuario?: UsuarioSessao }> {
  const codigo = normalizarCodigo(dados.codigo);
  const username = dados.username.trim().toLowerCase();
  const senha = dados.senha.trim();

  // Antes de qualquer consulta: o código tem 40 bits sorteados, o que deixa de
  // ser muito quando se pode tentar sem custo nenhum.
  const ip = await ipDoCliente();
  const balde = ip ? `ativacao:ip:${ip}` : "ativacao:global";
  const limite = await limitar(balde, 10, 15 * 60 * 1000);
  if (!limite.permitido) {
    return { ok: false, mensagem: "Muitas tentativas seguidas. Aguarde alguns minutos." };
  }

  // `normalizarCodigo` devolve "" quando o que sobrou não tem 8 caracteres —
  // é o que separa "digitou errado" de "código não existe", para a mensagem
  // apontar o problema certo.
  if (!codigo) {
    return { ok: false, mensagem: "Código incompleto. Confira com o seu professor." };
  }

  const problemaUsername = validarUsername(username);
  if (problemaUsername) {
    return { ok: false, mensagem: problemaUsername };
  }
  const problemaSenha = problemaDaSenha(senha, username);
  if (problemaSenha) {
    return { ok: false, mensagem: problemaSenha };
  }

  const db = clienteAdmin();

  const { data: pendente } = await db
    .from("usuarios")
    .select("id,aluno_id,codigo_expira_em")
    .eq("codigo_hash", hashCodigo(codigo))
    .maybeSingle();

  if (!pendente) {
    return {
      ok: false,
      mensagem: "Código inválido ou já usado. Peça um novo ao seu professor.",
    };
  }

  if (
    !pendente.codigo_expira_em ||
    new Date(pendente.codigo_expira_em as string).getTime() <= Date.now()
  ) {
    return { ok: false, mensagem: "Este código expirou. Peça um novo ao seu professor." };
  }

  // O username escolhido pode já ser de outra conta.
  const { data: emUso } = await db
    .from("usuarios")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (emUso && emUso.id !== pendente.id) {
    return { ok: false, mensagem: "Este nome de usuário já está em uso. Escolha outro." };
  }

  const hash = await hashSenha(senha);

  // O segundo `.eq("codigo_hash", …)` é o que faz o resgate ser de uso único, e
  // sem uma janela entre ler e escrever: dois pedidos simultâneos com o mesmo
  // código, só o primeiro encontra a linha ainda com o hash. O outro não acha
  // nada e cai na mensagem de "já usado", em vez de sobrescrever a senha que o
  // primeiro acabou de definir.
  const { data: ativado } = await db
    .from("usuarios")
    .update({
      senha_hash: hash,
      username,
      codigo_hash: null,
      codigo_expira_em: null,
    })
    .eq("id", pendente.id)
    .eq("codigo_hash", hashCodigo(codigo))
    .select("id,username,role,aluno_id")
    .maybeSingle();

  if (!ativado) {
    return {
      ok: false,
      mensagem: "Código inválido ou já usado. Peça um novo ao seu professor.",
    };
  }

  // Deu certo: zera o balde. Diferente do login, aqui não há varredura a
  // proteger — o código que existia deixou de existir.
  await limparLimite(balde);
  logger.info("AUTH", `Acesso ativado por código: ${username}`);

  const sessao = await sessaoDe(ativado);
  const jar = await cookies();
  jar.set(COOKIE_USUARIO, criarTokenSessao(sessao), opcoesCookie(TRINTA_DIAS));
  return { ok: true, usuario: sessao };
}

/** Encerra a sessão do usuário */
export async function deslogarUsuario(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_USUARIO);
  jar.delete(COOKIE_ADM);
}
