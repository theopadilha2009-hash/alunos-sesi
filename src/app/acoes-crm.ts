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

  const email = sanitizarTexto(formData.get("email"), 100);
  const novaSenha = String(formData.get("novaSenha") ?? "").trim();
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "").trim();

  const db = clienteAdmin();

  // Atualização opcional de senha se informada no formulário
  if (novaSenha) {
    if (novaSenha.length < 4) {
      return { ok: false, mensagem: "A nova senha deve ter no mínimo 4 caracteres." };
    }
    if (novaSenha !== confirmarSenha) {
      return { ok: false, mensagem: "A confirmação da nova senha não confere." };
    }
    const { hashSenha } = await import("@/lib/auth");
    const novaHash = hashSenha(novaSenha);
    await db.from("usuarios").update({ senha_hash: novaHash }).eq("username", sessao.username);
    logger.info("AUTH", `Senha atualizada para o usuário: ${sessao.username}`);
  }

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

    // Atualiza a sessão ativa no cookie para refletir o novo nome e sala instantaneamente
    const { cookies } = await import("next/headers");
    const { criarTokenSessao, COOKIE_USUARIO } = await import("@/lib/auth");
    const { opcoesCookie, TRINTA_DIAS } = await import("@/lib/sessao");

    const novaSessao = {
      ...sessao,
      nome,
      sala: salaNome || sessao.sala,
      email: email || sessao.email,
    };
    const jar = await cookies();
    jar.set(COOKIE_USUARIO, criarTokenSessao(novaSessao), opcoesCookie(TRINTA_DIAS));

    revalidatePath("/");
    revalidatePath("/alunos");
    return { ok: true, mensagem: novaSenha ? "Perfil e senha atualizados com sucesso!" : "Perfil atualizado com sucesso!" };
  } catch (err) {
    logger.error("CRM", "Erro ao salvar perfil do aluno", err);
    return {
      ok: false,
      mensagem: err instanceof Error ? err.message : "Erro ao salvar perfil.",
    };
  }
}

/** Altera credenciais de segurança, senha e nome visual do usuário */
export async function alterarSegurancaAction(
  _prev: EstadoAcaoCrm,
  formData: FormData,
): Promise<EstadoAcaoCrm> {
  const sessao = await obterSessao();
  if (!sessao) {
    return { ok: false, mensagem: "Você precisa estar conectado para alterar dados de segurança." };
  }

  const nome = sanitizarTexto(formData.get("nome"), 100);
  const email = sanitizarTexto(formData.get("email"), 100);
  const novaSenha = String(formData.get("novaSenha") ?? "").trim();
  const confirmarSenha = String(formData.get("confirmarSenha") ?? "").trim();

  const db = clienteAdmin();
  const mudancas: string[] = [];

  // 1. Atualização de Senha
  if (novaSenha) {
    if (novaSenha.length < 4) {
      return { ok: false, mensagem: "A nova senha deve ter no mínimo 4 caracteres." };
    }
    if (novaSenha !== confirmarSenha) {
      return { ok: false, mensagem: "A confirmação de senha não coincide com a nova senha digitada." };
    }

    const { hashSenha } = await import("@/lib/auth");
    const novaHash = hashSenha(novaSenha);
    const { error: errSenha } = await db
      .from("usuarios")
      .update({ senha_hash: novaHash })
      .eq("username", sessao.username);

    if (errSenha) {
      logger.error("AUTH", "Erro ao atualizar senha no banco", errSenha);
      return { ok: false, mensagem: "Erro ao salvar nova senha no banco de dados." };
    }
    mudancas.push("senha alterada com sucesso");
  }

  // 2. Atualização de Nome Visual no Perfil
  let alunoId = sessao.alunoId;
  if (!alunoId && sessao.role === "super_adm") {
    const theo = (await alunoPorSlug("theo-padilha")) || (await alunoPorSlug("telor-de-espadilha"));
    if (theo) alunoId = theo.id;
  }

  if (nome && nome.length >= 2 && alunoId) {
    const { error: errNome } = await db.from("alunos").update({ nome }).eq("id", alunoId);
    if (!errNome) {
      mudancas.push("nome visual atualizado");
    }
  }

  // 3. Atualização do Cookie de Sessão
  const { cookies } = await import("next/headers");
  const { criarTokenSessao, COOKIE_USUARIO } = await import("@/lib/auth");
  const { opcoesCookie, TRINTA_DIAS } = await import("@/lib/sessao");

  const novaSessao = {
    ...sessao,
    nome: nome && nome.length >= 2 ? nome : sessao.nome,
    email: email || sessao.email,
  };

  const jar = await cookies();
  jar.set(COOKIE_USUARIO, criarTokenSessao(novaSessao), opcoesCookie(TRINTA_DIAS));

  revalidatePath("/");
  revalidatePath("/alunos");
  revalidatePath("/adm");

  const msg = mudancas.length > 0
    ? `Configurações atualizadas: ${mudancas.join(" e ")}!`
    : "Dados salvos com sucesso!";

  return { ok: true, mensagem: msg, usuario: novaSessao };
}

