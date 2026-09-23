"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Estado } from "@/app/adm/estado";
import { fold } from "@/lib/busca";
import { parseLista, type ErroLinha } from "@/lib/importar";
import { normalizarGithub, normalizarLinkedin } from "@/lib/links";
import { obterSessao } from "@/lib/auth";
import { COOKIE_ADM, crachaValido } from "@/lib/sessao";
import { slugUnico } from "@/lib/slug";
import { clienteAdmin } from "@/lib/supabase/admin";

/**
 * Toda ação do painel começa por `exigirAdm()`.
 *
 * Aceita tanto o cookie legado `COOKIE_ADM` quanto a sessão de `super_adm`
 * autenticada no CRM.
 */
async function exigirAdm() {
  const jar = await cookies();
  if (crachaValido(jar.get(COOKIE_ADM)?.value)) return;
  const sessao = await obterSessao();
  if (sessao && sessao.role === "super_adm") return;
  throw new Error("Acesso restrito ao ADM.");
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
        erros.push({
          linha: linha.linha,
          texto: linha.nome,
          motivo: error.message,
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

  if (error) return { ok: false, mensagem: error.message };
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
