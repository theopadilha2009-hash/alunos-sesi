import { cookies } from "next/headers";
import { hashCodigo, normalizarCodigo } from "./ativacao";
import { fold } from "./busca";
import { alunoPorId } from "./dados";
import { logger } from "./debug";
import { ipDoCliente, limitar, limparLimite } from "./rate-limit";
import { hashSenha, HASH_FANTASMA, verificarSenha } from "./senha";
import { sanitizarTexto } from "./seguranca";
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
 * As regras de senha, num lugar só.
 *
 * Elas já divergiram uma vez: o cadastro aceitava 4 caracteres e a troca de
 * senha exigia 8, então quem se cadastrou com senha curta não conseguia nem
 * repetir o próprio padrão depois. Cadastro e ativação usam esta função.
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

  const { data: usuarioDb, error } = await db
    .from("usuarios")
    .select("id,username,role,aluno_id,senha_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !usuarioDb) {
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

  // A sala tem que JÁ existir. Antes, um cadastro anônimo inseria em `salas`
  // com nome livre — o formulário de cadastro virava escrita aberta numa
  // tabela do sistema, e a vitrine ganhava turma inventada.
  //
  // Comparação por `fold` (sem acento, minúsculo) porque o campo é texto livre:
  // "dsm3" é a mesma turma que "DSM3". Feita em JS sobre a lista em vez de
  // ILIKE no banco, que trataria um `%` digitado pelo usuário como curinga.
  const { data: salasExistentes } = await db.from("salas").select("id,nome");
  const salaAchada = (salasExistentes ?? []).find(
    (s) => fold(s.nome as string) === fold(salaNome),
  );

  if (!salaAchada) {
    return {
      ok: false,
      mensagem: "Sala não encontrada. Confira o nome com o seu professor ou peça ao ADM para cadastrar a turma.",
    };
  }

  const salaId = salaAchada.id as string;

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
      bio: "Novo estudante no CRM SESI. Edite seu perfil para adicionar projetos e bio!",
      projetos: [],
      midias: [],
      // Nasce OCULTO: o auto-cadastro é anônimo (não há convite nem
      // confirmação de vínculo), então a vitrine não pode aceitar o que ele
      // cria sem um humano olhar. O ADM aprova pelo painel e o perfil aparece.
      // As criações do próprio ADM ficam de fora disto — elas usam o default
      // da coluna, que é `true`.
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
    // Nome canônico da sala, não o que o aluno digitou: "dsm3" e "DSM3" são a
    // mesma turma, e o crachá não pode sair com a grafia de quem digitou.
    sala: salaAchada.nome as string,
    // `null`, não um endereço derivado do username: quem acabou de se cadastrar
    // ainda não informou e-mail nenhum, e inventar `joao.silva@aluno.sesisp...`
    // exibiria no perfil um endereço que não existe. Ele preenche o dele no
    // editor, e aí sim é da escola.
    email: null,
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
