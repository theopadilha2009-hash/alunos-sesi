"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Estado, EstadoCodigo } from "@/app/adm/estado";
import { formatarCodigo, gerarCodigo, hashCodigo, VALIDADE_CODIGO_MS } from "@/lib/ativacao";
import { fold } from "@/lib/busca";
import { logger } from "@/lib/debug";
import { parseLista, type ErroLinha } from "@/lib/importar";
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

  if (data?.role !== "super_adm") throw new Error("Acesso restrito ao ADM.");
}

function revalidar() {
  revalidatePath("/");
  revalidatePath("/alunos");
  revalidatePath("/adm");
}

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? "").trim();
}

/** Sala pelo nome, criando se não existir. Aguenta duas colagens ao mesmo tempo. */
async function garantirSala(
  db: ReturnType<typeof clienteAdmin>,
  nome: string,
): Promise<string> {
  const { data: achada } = await db
    .from("salas")
    .select("id")
    .eq("nome", nome)
    .maybeSingle();
  if (achada) return achada.id as string;

  const { data: criada, error } = await db
    .from("salas")
    .insert({ nome })
    .select("id")
    .single();

  if (error) {
    // Corrida: alguém criou a mesma sala entre o select e o insert.
    const { data: deNovo } = await db
      .from("salas")
      .select("id")
      .eq("nome", nome)
      .maybeSingle();
    if (deNovo) return deNovo.id as string;
    throw new Error(`não deu para criar a sala "${nome}": ${error.message}`);
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
    return { ok: false, mensagem: `Falha ao ler os alunos: ${erroLeitura.message}` };
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

    const salaId = await garantirSala(db, linha.sala);
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
        // ler. Antes o painel exibia `duplicate key value violates unique
        // constraint "alunos_slug_key"` no lugar do motivo.
        logger.error("ADM", `Falha ao importar ${linha.nome}`, error);
        erros.push({
          linha: linha.linha,
          texto: linha.nome,
          motivo: "não foi possível gravar (erro no banco)",
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
      erros.push({
        linha: linha.linha,
        texto: linha.nome,
        motivo: error.message,
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

  return {
    ok: criados + atualizados > 0,
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

  const { error } = await db.from("alunos").insert({
    nome,
    slug,
    sala_id: await garantirSala(db, sala),
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
      return { ok: false, mensagem: `Não deu para emitir o código: ${error.message}` };
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
      return { ok: false, mensagem: `Não deu para emitir o código: ${error.message}` };
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
 */
export async function mudarSalaDoAluno(formData: FormData): Promise<void> {
  await exigirAdm();

  const alunoId = texto(formData, "alunoId");
  const nomeSala = sanitizarTexto(texto(formData, "sala"), 30);

  if (!alunoId || nomeSala.length < 2) return;

  const db = clienteAdmin();

  const { data: aluno } = await db.from("alunos").select("id").eq("id", alunoId).maybeSingle();
  if (!aluno) return;

  const salaId = await garantirSala(db, nomeSala);
  await db.from("alunos").update({ sala_id: salaId }).eq("id", alunoId);

  revalidar();
}
