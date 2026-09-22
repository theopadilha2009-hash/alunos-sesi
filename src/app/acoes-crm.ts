"use server";

import { revalidatePath } from "next/cache";
import { autenticarUsuario, deslogarUsuario, obterSessao, registrarUsuario } from "@/lib/auth";
import { atualizarPerfilAluno, alunoPorId } from "@/lib/dados";
import { normalizarGithub, normalizarLinkedin } from "@/lib/links";
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

/** Salva as edições do perfil do estudante */
export async function salvarPerfilAction(
  _prev: EstadoAcaoCrm,
  formData: FormData,
): Promise<EstadoAcaoCrm> {
  const sessao = await obterSessao();
  if (!sessao || !sessao.alunoId) {
    return { ok: false, mensagem: "Você precisa estar conectado para editar o perfil." };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const salaNome = String(formData.get("sala") ?? "").trim();
  const linkedinBruto = String(formData.get("linkedin") ?? "").trim();
  const githubBruto = String(formData.get("github") ?? "").trim();
  const instagramBruto = String(formData.get("instagram") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const projetosJson = String(formData.get("projetos") ?? "[]");
  const midiasJson = String(formData.get("midias") ?? "[]");

  if (nome.length < 2) {
    return { ok: false, mensagem: "O nome precisa ter pelo menos 2 caracteres." };
  }

  let projetos: ProjetoAluno[] = [];
  try {
    projetos = JSON.parse(projetosJson);
  } catch {
    projetos = [];
  }

  let midias: MidiaAluno[] = [];
  try {
    midias = JSON.parse(midiasJson);
  } catch {
    midias = [];
  }

  // Moderação preventiva para ambiente escolar:
  // Verifica se há termos inadequados em legendas ou títulos
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
  if (instagram) instagram = `@${instagram}`;

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
    await atualizarPerfilAluno(sessao.alunoId, dadosAtualizacao);
    revalidatePath("/");
    revalidatePath("/alunos");
    return { ok: true, mensagem: "Perfil atualizado com sucesso!" };
  } catch (err) {
    return {
      ok: false,
      mensagem: err instanceof Error ? err.message : "Erro ao salvar perfil.",
    };
  }
}
