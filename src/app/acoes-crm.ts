"use server";

import { revalidatePath } from "next/cache";
import { autenticarUsuario, deslogarUsuario, obterSessao, registrarUsuario } from "@/lib/auth";
import { atualizarPerfilAluno, alunoPorSlug } from "@/lib/dados";
import { logger } from "@/lib/debug";
import { normalizarGithub, normalizarLinkedin } from "@/lib/links";
import {
  sanitizarMidias,
  sanitizarProjetos,
  sanitizarTexto,
  verificarRateLimit,
} from "@/lib/seguranca";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { MidiaAluno, ProjetoAluno } from "@/lib/tipos";

export type EstadoAcaoCrm = {
  ok: boolean;
  mensagem?: string;
  usuario?: unknown;
};

export async function loginAction(
  _prev: EstadoAcaoCrm,
  formData: FormData,
): Promise<EstadoAcaoCrm> {
  const username = String(formData.get("username") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const res = await autenticarUsuario(username, senha);
  if (res.ok) {
    revalidatePath("/");
    return { ok: true, usuario: res.usuario };
  }
  return { ok: false, mensagem: res.mensagem ?? "Falha na autenticação." };
}

export async function cadastroAction(
  _prev: EstadoAcaoCrm,
  formData: FormData,
): Promise<EstadoAcaoCrm> {
  const username = String(formData.get("username") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const nome = String(formData.get("nome") ?? "");
  const salaNome = String(formData.get("sala") ?? "");

  const res = await registrarUsuario({ username, senha, nome, salaNome });
  if (res.ok) {
    revalidatePath("/");
    return { ok: true, usuario: res.usuario };
  }
  return { ok: false, mensagem: res.mensagem ?? "Falha ao cadastrar." };
}

export async function logoutAction(): Promise<void> {
  await deslogarUsuario();
  revalidatePath("/");
}

/** Salva as edições do perfil do estudante com validação e sanitização estrita */
export async function salvarPerfilAction(
  _prev: EstadoAcaoCrm,
  formData: FormData,
): Promise<EstadoAcaoCrm> {
  const sessao = await obterSessao();
  if (!sessao) {
    return { ok: false, mensagem: "Você precisa estar conectado para editar o perfil." };
  }

  let alunoId = sessao.alunoId;
  if (!alunoId && sessao.role === "super_adm") {
    const telor = await alunoPorSlug("telor-de-espadilha");
    if (telor) alunoId = telor.id;
  }

  if (!alunoId) {
    return { ok: false, mensagem: "Perfil de estudante não associado a esta conta." };
  }

  // Rate limit: máx 20 salvamentos por minuto por aluno
  const limit = verificarRateLimit(`salvar-perfil:${alunoId}`, 20, 60 * 1000);
  if (!limit.permitido) {
    return {
      ok: false,
      mensagem: "Muitas alterações em pouco tempo. Aguarde alguns instantes antes de salvar novamente.",
    };
  }

  const nome = sanitizarTexto(formData.get("nome"), 100);
  const salaNome = sanitizarTexto(formData.get("sala"), 30);
  const linkedinBruto = String(formData.get("linkedin") ?? "").trim();
  const githubBruto = String(formData.get("github") ?? "").trim();
  const instagramBruto = String(formData.get("instagram") ?? "").trim();
  const bio = sanitizarTexto(formData.get("bio"), 280);
  const projetosJson = String(formData.get("projetos") ?? "[]");
  const midiasJson = String(formData.get("midias") ?? "[]");

  if (nome.length < 2) {
    return { ok: false, mensagem: "O nome precisa ter pelo menos 2 caracteres." };
  }

  let projetosBrutos: unknown[] = [];
  try {
    projetosBrutos = JSON.parse(projetosJson);
  } catch {
    projetosBrutos = [];
  }

  let midiasBrutas: unknown[] = [];
  try {
    midiasBrutas = JSON.parse(midiasJson);
  } catch {
    midiasBrutas = [];
  }

  // Sanitização estrita e validação de URLs / esquemas
  const projetos = sanitizarProjetos(projetosBrutos);
  const midias = sanitizarMidias(midiasBrutas);

  // Moderação preventiva para ambiente escolar
  const termosProibidos = /\b(porn|xxx|nsfw|sex|nude|violencia|arma|droga|aposta|bet)\b/i;
  for (const m of midias) {
    if (m.legenda && termosProibidos.test(m.legenda)) {
      return {
        ok: false,
        mensagem: "Conteúdo rejeitado pela moderação escolar: utilize apenas mídias educativas e adequadas para todas as idades.",
      };
    }
  }

  const linkedin = normalizarLinkedin(linkedinBruto);
  const github = normalizarGithub(githubBruto);

  // Normaliza instagram (garante @ ou link amigável)
  let instagram = instagramBruto ? instagramBruto.replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/^@/, "") : null;
  if (instagram) {
    instagram = sanitizarTexto(`@${instagram}`, 40);
  }

  const db = clienteAdmin();

  // Se a sala mudou, garante ela
  let salaId: string | null = null;
  if (salaNome) {
    const { data: salaAchada } = await db.from("salas").select("id").eq("nome", salaNome).maybeSingle();
    if (salaAchada) {
      salaId = salaAchada.id;
    } else {
      const { data: nova } = await db.from("salas").insert({ nome: salaNome }).select("id").single();
      if (nova) salaId = nova.id;
    }
  }

  const dadosAtualizacao: Record<string, unknown> = {
    nome,
    bio: bio || null,
    linkedin,
    github,
    instagram,
    projetos,
    midias,
  };

  if (salaId) {
    dadosAtualizacao.sala_id = salaId;
  }

  try {
    await atualizarPerfilAluno(alunoId, dadosAtualizacao);
    logger.info("CRM", `Perfil atualizado com sucesso: alunoId=${alunoId}, nome=${nome}`);
    revalidatePath("/");
    revalidatePath("/alunos");
    return { ok: true, mensagem: "Perfil atualizado com sucesso!" };
  } catch (err) {
    logger.error("CRM", "Erro ao salvar perfil do aluno", err);
    return {
      ok: false,
      mensagem: err instanceof Error ? err.message : "Erro ao salvar perfil.",
    };
  }
}
