"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Estado, EstadoCodigo } from "@/app/adm/estado";
import { formatarCodigo, gerarCodigo, hashCodigo, VALIDADE_CODIGO_MS } from "@/lib/ativacao";
import { fold } from "@/lib/busca";
import { chaveDaSala } from "@/lib/cores";
import { decidirSubmissao, idsDeDesafios, limparCacheDados, publicarDesafio } from "@/lib/dados";
import { logger } from "@/lib/debug";
import {
  MAX_DESCRICAO,
  MAX_PRAZO,
  MAX_RECOMPENSA,
  MAX_SUBTITULO,
  MAX_TITULO,
  parseCriterios,
  problemaDoDesafio,
  type DesafioNovo,
} from "@/lib/desafios";
import { parseLista, type ErroLinha } from "@/lib/importar";
import { tomDaImportacao } from "@/lib/importacao";
import { normalizarGithub, normalizarLinkedin } from "@/lib/links";
import { SENHA_BLOQUEADA } from "@/lib/senha";
import { sanitizarTexto } from "@/lib/seguranca";
import { obterSessao } from "@/lib/auth";
import { COOKIE_ADM, crachaValido } from "@/lib/sessao";
import { slugUnico } from "@/lib/slug";
import { clienteAdmin } from "@/lib/supabase/admin";

/**
 * Toda ação do painel começa por `exigirAdm()`.
 *
 * Aceita tanto o cookie legado `COOKIE_ADM` quanto a sessão de `super_adm`
 * autenticada no CRM.
 *
 * O `role` é relido do banco de propósito. Ele viaja dentro do token assinado,
 * então é um retrato da hora do login: um rebaixamento no banco ficaria sem
 * efeito por até 30 dias, que é a validade do cookie. Uma query por ação de
 * painel fecha essa janela — e o painel não é rota quente.
 */
async function exigirAdm() {
  const jar = await cookies();
  if (crachaValido(jar.get(COOKIE_ADM)?.value)) return;

  const sessao = await obterSessao();
  if (!sessao) throw new Error("Acesso restrito ao ADM.");

  const { data } = await clienteAdmin()
    .from("usuarios")
    .select("role")
    .eq("id", sessao.id)
    .maybeSingle();

  if (data?.role !== "super_adm" && data?.role !== "adm") {
    throw new Error("Acesso restrito ao ADM.");
  }
}

function revalidar() {
  limparCacheDados();
  revalidatePath("/");
  revalidatePath("/alunos");
  revalidatePath("/adm");
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/**
 * Motivo de falha em linguagem que o ADM entende, para o relatório da importação.
 *
 * O `error.message` do PostgREST é jargão — `duplicate key value violates unique
 * constraint` não diz ao professor o que fazer com a linha. Quem chama já manda
 * o erro real para o log; aqui sai só a frase.
 */
function motivoDaFalha(error: { code?: string; message: string }): string {
  // O único UNIQUE de `alunos` é o `slug`: um 23505 aqui é colisão de endereço
  // de perfil, não de nome — a dedup por nome+sala é do app, via `fold`, e não
  // tem constraint no banco que a sustente.
  if (error.code === "23505") return "já existe outro aluno com esse endereço de perfil";
  if (error.code === "23503") return "a turma informada não existe mais";
  return "o banco recusou esta linha";
}

/** Sala pelo nome, criando se não existir. Aguenta duas colagens ao mesmo tempo. */
async function garantirSala(
  db: ReturnType<typeof clienteAdmin>,
  nome: string,
): Promise<string> {
  const nomePadrao = chaveDaSala(nome);

  // A busca é por chave, sobre a lista em memória — não por `ilike` no banco. No
  // `ilike`, o nome vindo da planilha ou digitado vira PADRÃO de busca: um `%`
  // solto casa a primeira sala de qualquer nome e o aluno entra na turma errada
  // em silêncio. `eq` sozinho também não serve: é sensível a caixa, e o "dsm3"
  // da planilha precisa achar a linha "DSM3".
  //
  // A chave é `chaveDaSala` (`cores.ts`), NÃO o `fold` de `busca.ts`. A primeira
  // versão desta correção usou `fold` e trocou um bug por outro: `fold` é
  // equivalência de BUSCA e apaga `º`/`ª`/acento, então "3A" da planilha passou a
  // casar a linha "3ºA" — que é o formato de verdade e uma linha DIFERENTE no
  // banco (`unique` sem `citext`). O aluno era matriculado na turma errada, agora
  // sem nem o sintoma que o `ilike` dava. Identidade de turma é caixa, não acento.
  //
  // atalho: varredura de `salas` inteira em memória (dezenas de linhas, e o
  // `garantirSala` roda uma vez por linha colada); se a tabela passar de alguns
  // milhares, criar uma coluna de nome normalizado com índice e voltar ao `eq`.
  const { data: existentes } = await db.from("salas").select("id,nome");
  const achada = (existentes ?? []).find(
    (s) => chaveDaSala(s.nome as string) === nomePadrao,
  );
  if (achada) return achada.id as string;

  const { data: criada, error } = await db
    .from("salas")
    .insert({ nome: nomePadrao })
    .select("id")
    .single();

  if (error) {
    // Corrida: alguém criou a mesma sala entre o select e o insert.
    const { data: deNovo } = await db.from("salas").select("id,nome");
    const mesma = (deNovo ?? []).find(
      (s) => chaveDaSala(s.nome as string) === nomePadrao,
    );
    if (mesma) return mesma.id as string;
    // O erro cru do PostgREST vai para o log; quem chamou recebe uma frase. A
    // mensagem antiga subia com o jargão embutido e, sem try/catch no laço da
    // importação, derrubava a colagem inteira levando o texto do banco junto.
    logger.error("ADM", `Falha ao criar a turma "${nomePadrao}"`, error);
    throw new Error(`Não foi possível criar a turma "${nomePadrao}".`);
  }

  return criada.id as string;
}

// ── colar a lista da turma ───────────────────────────────────────────────

export async function importarLista(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  await exigirAdm();

  const bruto = String(formData.get("lista") ?? "");
  const lido = parseLista(bruto);
  if (lido.linhas.length === 0) {
    return {
      ok: false,
      mensagem: "Nenhuma linha aproveitável na colagem.",
      erros: lido.erros,
    };
  }

  const db = clienteAdmin();
  const erros: ErroLinha[] = [...lido.erros];

  const { data: jaExistem, error: erroLeitura } = await db
    .from("alunos")
    .select("id,slug,nome,sala_id,linkedin,github");
  if (erroLeitura) {
    logger.error("ADM", "Falha ao ler os alunos na importação", erroLeitura);
    return { ok: false, mensagem: "Não foi possível ler a lista de alunos agora. Tente de novo." };
  }

  const slugs = new Set((jaExistem ?? []).map((a) => a.slug as string));
  const porChave = new Map<
    string,
    { id: string; linkedin: string | null; github: string | null }
  >();
  for (const a of jaExistem ?? []) {
    porChave.set(`${fold(a.nome)}|${a.sala_id}`, {
      id: a.id as string,
      linkedin: a.linkedin as string | null,
      github: a.github as string | null,
    });
  }

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  for (const linha of lido.linhas) {
    const linkedin = normalizarLinkedin(linha.linkedin);
    const github = normalizarGithub(linha.github);

    if (linha.linkedin && !linkedin) {
      erros.push({
        linha: linha.linha,
        texto: linha.linkedin,
        motivo: "LinkedIn não reconhecido",
      });
    }
    if (linha.github && !github) {
      erros.push({
        linha: linha.linha,
        texto: linha.github,
        motivo: "GitHub não reconhecido",
      });
    }

    // Sem o try/catch, uma sala que não sobe lançava e abortava a importação
    // inteira: as linhas boas antes dela ficavam no banco sem o ADM saber quais,
    // e o relatório nunca saía. Aqui a linha vira erro e o laço segue.
    let salaId: string;
    try {
      salaId = await garantirSala(db, linha.sala);
    } catch (err) {
      erros.push({
        linha: linha.linha,
        texto: linha.sala,
        motivo: err instanceof Error ? err.message : "não deu para criar a turma",
      });
      continue;
    }

    const chave = `${fold(linha.nome)}|${salaId}`;
    const existente = porChave.get(chave);

    if (!existente) {
      const slug = slugUnico(linha.nome, slugs);
      const { error } = await db.from("alunos").insert({
        nome: linha.nome,
        slug,
        sala_id: salaId,
        linkedin,
        github,
      });
      if (error) {
        // O log guarda o erro do PostgREST; a linha mostra o que o ADM precisa
        // ler. Este é o ramo onde a colisão de slug acontece — o UPDATE abaixo
        // só toca linkedin/github de uma linha que já existe.
        logger.error("ADM", `Falha ao importar ${linha.nome}`, error);
        erros.push({
          linha: linha.linha,
          texto: linha.nome,
          motivo: motivoDaFalha(error),
        });
        continue;
      }
      slugs.add(slug);
      porChave.set(chave, { id: slug, linkedin, github });
      criados++;
      continue;
    }

    // Já existe: preenche só o que está faltando. Nunca sobrescreve um link
    // que o aluno já tinha — reimportar a planilha não pode desfazer
    // correção feita à mão.
    const faltando: { linkedin?: string; github?: string } = {};
    if (!existente.linkedin && linkedin) faltando.linkedin = linkedin;
    if (!existente.github && github) faltando.github = github;

    if (Object.keys(faltando).length === 0) {
      ignorados++;
      continue;
    }

    const { error } = await db
      .from("alunos")
      .update(faltando)
      .eq("id", existente.id);
    if (error) {
      logger.error("ADM", `Falha ao completar ${linha.nome}`, error);
      erros.push({
        linha: linha.linha,
        texto: linha.nome,
        motivo: motivoDaFalha(error),
      });
      continue;
    }
    porChave.set(chave, { ...existente, ...faltando });
    atualizados++;
  }

  revalidar();

  const resumo = [
    criados ? `${criados} novo${criados > 1 ? "s" : ""}` : null,
    atualizados ? `${atualizados} completado${atualizados > 1 ? "s" : ""}` : null,
    ignorados ? `${ignorados} já estava${ignorados > 1 ? "m" : ""} completo${ignorados > 1 ? "s" : ""}` : null,
    lido.duplicadas ? `${lido.duplicadas} duplicada${lido.duplicadas > 1 ? "s" : ""} na própria colagem` : null,
  ].filter(Boolean);

  // O tom não é o `ok`: reimportar uma planilha que já está toda lá é sucesso
  // neutro, e com o booleano só ele virava banner vermelho ("12 já estavam
  // completos"). `ok` continua significando "não houve falha".
  const tom = tomDaImportacao({ criados, atualizados, erros: erros.length });

  return {
    ok: tom !== "erro",
    tom,
    mensagem: resumo.length ? resumo.join(" · ") : "Nada mudou.",
    erros,
  };
}

// ── um aluno por vez ─────────────────────────────────────────────────────

export async function criarAluno(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  await exigirAdm();

  const nome = texto(formData, "nome");
  const sala = texto(formData, "sala");
  if (nome.length < 2) return { ok: false, mensagem: "Nome muito curto." };
  if (!sala) return { ok: false, mensagem: "Informe a sala." };

  const db = clienteAdmin();
  const { data: todos } = await db.from("alunos").select("slug");
  const slug = slugUnico(nome, (todos ?? []).map((a) => a.slug as string));

  // Mesma exposição do laço da importação: `garantirSala` lança quando não
  // consegue criar a turma, e uma Server Action que lança devolve erro genérico
  // do Next em vez da frase que o ADM precisa ler.
  let salaId: string;
  try {
    salaId = await garantirSala(db, sala);
  } catch {
    return { ok: false, mensagem: `Não foi possível criar a turma "${sala}".` };
  }

  const { error } = await db.from("alunos").insert({
    nome,
    slug,
    sala_id: salaId,
    linkedin: normalizarLinkedin(texto(formData, "linkedin")),
    github: normalizarGithub(texto(formData, "github")),
    bio: texto(formData, "bio") || null,
  });

  if (error) {
    logger.error("ADM", `Falha ao cadastrar ${nome}`, error);
    return { ok: false, mensagem: "Não foi possível cadastrar agora. Tente de novo em instantes." };
  }
  revalidar();
  return { ok: true, mensagem: `${nome} entrou na turma.` };
}

/**
 * Fixar e remover não devolvem estado: são `<form action={...}>` direto na
 * lista, sem `useActionState` — não há o que mostrar de volta.
 */
export async function removerAluno(formData: FormData): Promise<void> {
  await exigirAdm();
  const id = texto(formData, "id");
  if (!id) return;
  await clienteAdmin().from("alunos").delete().eq("id", id);
  revalidar();
}

/**
 * Libera ou volta a ocultar um perfil na vitrine.
 *
 * É o outro lado de `registrarUsuario`: o auto-cadastro cria o aluno com
 * `aprovado: false`, e é aqui que um humano decide se ele aparece. Sem isto a
 * coluna nasceria `false` para sempre e a moderação seria só uma porta fechada.
 *
 * Toggle e não sentido único: desaprovar é o botão de "tirar do ar" quando
 * alguém entra com nome inadequado — a alternativa seria `removerAluno`, que
 * apaga o registro inteiro e não tem volta.
 */
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Emite o código com que o aluno assume o perfil que já está na planilha.
 *
 * É a peça que faltava: `importarLista` e `criarAluno` gravam só em `alunos`,
 * então o aluno importado não tinha como entrar no próprio perfil — e o
 * auto-cadastro dele criava uma SEGUNDA linha, pendente, deixando a primeira
 * órfã.
 *
 * A conta nasce aqui, com `SENHA_BLOQUEADA` no lugar da senha, que
 * `verificarSenha` recusa. Ela existe para segurar o código e o vínculo com o
 * aluno; quem define a senha é o resgate, em `auth.ts`.
 *
 * O `username` provisório é o id do aluno sem hífens, e não um contador: dois
 * ADMs emitindo para o mesmo aluno ao mesmo tempo caem no mesmo username e o
 * UNIQUE resolve, em vez de criar duas contas para a mesma pessoa. Ele some no
 * resgate, quando o aluno escolhe o dele.
 */
export async function gerarCodigoAtivacao(
  _estado: EstadoCodigo,
  formData: FormData,
): Promise<EstadoCodigo> {
  await exigirAdm();

  const alunoId = texto(formData, "alunoId");
  if (!RE_UUID.test(alunoId)) {
    return { ok: false, mensagem: "Aluno inválido." };
  }

  const db = clienteAdmin();

  const { data: aluno } = await db
    .from("alunos")
    .select("id,nome")
    .eq("id", alunoId)
    .maybeSingle();
  if (!aluno) {
    return { ok: false, mensagem: "Aluno não encontrado." };
  }

  const codigo = gerarCodigo();
  const agora = Date.now();
  const campos = {
    codigo_hash: hashCodigo(codigo),
    codigo_expira_em: new Date(agora + VALIDADE_CODIGO_MS).toISOString(),
  };

  const { data: existente } = await db
    .from("usuarios")
    .select("id,senha_hash")
    .eq("aluno_id", alunoId)
    .maybeSingle();

  if (existente) {
    // Já tem senha de verdade: reemitir aqui trocaria a senha em uso por um
    // código, deixando o aluno de fora até resgatar. Trocar senha é outra
    // tela, com a senha atual na mão.
    if (existente.senha_hash !== SENHA_BLOQUEADA) {
      return { ok: false, mensagem: `${aluno.nome} já tem acesso ativo.` };
    }

    const { error } = await db
      .from("usuarios")
      .update(campos)
      .eq("id", existente.id);
    if (error) {
      logger.error("ADM", `Falha ao reemitir código para ${aluno.nome}`, error);
      return { ok: false, mensagem: "Não deu para emitir o código agora. Tente de novo." };
    }
  } else {
    const { error } = await db.from("usuarios").insert({
      username: `pendente-${alunoId.replace(/-/g, "")}`,
      senha_hash: SENHA_BLOQUEADA,
      role: "aluno",
      aluno_id: alunoId,
      ...campos,
    });
    if (error) {
      logger.error("ADM", `Falha ao emitir código para ${aluno.nome}`, error);
      return { ok: false, mensagem: "Não deu para emitir o código agora. Tente de novo." };
    }
  }

  logger.info("ADM", `Código de ativação emitido para ${aluno.nome}`);
  revalidar();

  // O código em claro sai daqui e não fica em lugar nenhum: o banco guarda o
  // hash. Se o ADM fechar a tela antes de passar para o aluno, emite outro.
  return {
    ok: true,
    mensagem: "",
    codigo: formatarCodigo(codigo),
    paraQuem: aluno.nome as string,
  };
}

export async function aprovarAluno(formData: FormData): Promise<void> {
  await exigirAdm();

  const id = texto(formData, "id");
  if (!id) return;

  const db = clienteAdmin();
  const { data: atual } = await db
    .from("alunos")
    .select("aprovado")
    .eq("id", id)
    .maybeSingle();
  if (!atual) return;

  await db
    .from("alunos")
    .update({ aprovado: !atual.aprovado })
    .eq("id", id);

  revalidar();
}

export async function alternar(formData: FormData): Promise<void> {
  await exigirAdm();

  const id = texto(formData, "id");
  const campo = texto(formData, "campo");
  if (!id || (campo !== "fixado" && campo !== "destaque")) return;

  const db = clienteAdmin();
  const { data: atual } = await db
    .from("alunos")
    .select("fixado,destaque")
    .eq("id", id)
    .maybeSingle();
  if (!atual) return;

  await db
    .from("alunos")
    .update({ [campo]: !atual[campo as "fixado" | "destaque"] })
    .eq("id", id);

  revalidar();
}

// ── sala do aluno ────────────────────────────────────────────────────────

/**
 * Move um aluno de turma.
 *
 * Existe porque o aluno deixou de poder fazer isso: `salvarPerfilAction` lia
 * `sala` do formulário e criava a sala se não existisse, então qualquer conta
 * logada se movia de turma com um POST.
 *
 * A sala é criada se não existir: quem digita aqui é o ADM, e ele é a
 * autoridade sobre a lista de turmas — o oposto do cadastro anônimo, que agora
 * só aceita turma existente.
 *
 * Devolve `void` (e não `Estado`) porque é chamada direto como `action` de um
 * `<form>` no painel, igual a `alternar` e `removerAluno`: ação de formulário
 * simples recebe só o `FormData`, não o par `(estado, formData)` do
 * `useActionState`.
 *
 * O cookie de sessão do próprio aluno continua com a sala antiga até ele logar
 * de novo — não dá para reescrever o cookie de outra pessoa daqui. A vitrine, o
 * crachá e a listagem leem do banco e já refletem a troca.
 *
 * `revalidar()` roda também nos caminhos de FALHA, e isso não é zelo: quem
 * chamou já pintou a turma nova na linha (`handleMudarSalaAluno`, no CRM) antes
 * de a resposta chegar. Sem a revalidação, a lista local guarda a troca que o
 * banco recusou e não recebe prop nova nenhuma para desfazê-la — o painel fica
 * mostrando ao ADM uma turma que ninguém gravou.
 */
export async function mudarSalaDoAluno(formData: FormData): Promise<void> {
  await exigirAdm();

  const alunoId = texto(formData, "alunoId");
  const salaIdParam = texto(formData, "salaId");
  const nomeSala = sanitizarTexto(texto(formData, "sala"), 30);

  if (!alunoId) return;

  const db = clienteAdmin();

  let salaIdFinal = "";

  if (salaIdParam && RE_UUID.test(salaIdParam)) {
    salaIdFinal = salaIdParam;
  } else if (salaIdParam) {
    const { data: s } = await db.from("salas").select("id").eq("id", salaIdParam).maybeSingle();
    if (s?.id) {
      salaIdFinal = s.id as string;
    }
  }

  if (!salaIdFinal) {
    const nomeAlvo = nomeSala || (salaIdParam && !RE_UUID.test(salaIdParam) ? salaIdParam : "");
    if (nomeAlvo.length >= 2) {
      try {
        salaIdFinal = await garantirSala(db, nomeAlvo);
      } catch (err) {
        logger.error("ADM", `Falha ao garantir sala "${nomeAlvo}"`, err);
        revalidar();
        return;
      }
    }
  }

  if (!salaIdFinal) {
    revalidar();
    return;
  }

  const { error } = await db.from("alunos").update({ sala_id: salaIdFinal }).eq("id", alunoId);
  if (error) {
    logger.error("ADM", `Falha ao atualizar sala do aluno ${alunoId}`, error);
    revalidar();
    return;
  }

  revalidar();
}

/**
 * Publica um desafio no mural.
 *
 * Antes disto `desafios` só recebia linha por SQL na mão: a tabela existe em
 * produção desde antes do repositório (a 004 fechou o drift) e nunca teve tela
 * de escrita. O mural aparecia vazio para o aluno e não havia como preenchê-lo.
 *
 * O `id` sai do título pelo mesmo `slugUnico` do aluno — ele é a chave primária
 * e viaja nas submissões, então precisa ser legível e não colidir.
 */
export async function publicarDesafioAction(
  _estado: Estado,
  formData: FormData,
): Promise<Estado> {
  await exigirAdm();

  const dados: DesafioNovo = {
    titulo: sanitizarTexto(texto(formData, "titulo"), MAX_TITULO),
    subtitulo: sanitizarTexto(texto(formData, "subtitulo"), MAX_SUBTITULO),
    categoria: texto(formData, "categoria"),
    prazo: sanitizarTexto(texto(formData, "prazo"), MAX_PRAZO),
    recompensa: sanitizarTexto(texto(formData, "recompensa"), MAX_RECOMPENSA),
    descricao: sanitizarTexto(texto(formData, "descricao"), MAX_DESCRICAO),
    criterios: parseCriterios(texto(formData, "criterios")).map((c) =>
      sanitizarTexto(c, 120),
    ),
  };

  const problema = problemaDoDesafio(dados);
  if (problema) return { ok: false, mensagem: problema };

  const id = slugUnico(dados.titulo, await idsDeDesafios());
  const resultado = await publicarDesafio({ id, ...dados });

  if (!resultado.ok) {
    return {
      ok: false,
      mensagem: resultado.duplicado
        ? "Já existe um desafio nesse endereço. Mude o título."
        : "Não foi possível publicar o desafio agora. Tente de novo.",
    };
  }

  logger.info("ADM", `Desafio publicado: ${dados.titulo}`);
  revalidar();
  return { ok: true, mensagem: `"${dados.titulo}" está no mural.` };
}

/**
 * Aprova ou rejeita um envio do mural.
 *
 * `void` e não `Estado` porque é `action` direta de `<form>`, como `mudarSala`
 * e `removerAluno`: o botão que decide é um submit, não um `useActionState`.
 *
 * Quem julga é o mesmo `exigirAdm()` das outras ações do painel — hoje só
 * `super_adm`. Alargar isso para o professor da turma é a aposta 3, que muda
 * autorização e não entra de carona aqui.
 */
export async function decidirSubmissaoAction(formData: FormData): Promise<void> {
  await exigirAdm();

  const id = texto(formData, "submissaoId");
  if (!id) return;

  const aprovado = texto(formData, "decisao") === "aprovar";
  await decidirSubmissao(id, aprovado);
  revalidar();
}
