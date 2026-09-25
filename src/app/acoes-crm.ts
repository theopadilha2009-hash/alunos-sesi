"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  autenticarUsuario,
  COOKIE_USUARIO,
  criarTokenSessao,
  deslogarUsuario,
  obterSessao,
  registrarUsuario,
} from "@/lib/auth";
import { apoiarHabilidade, atualizarPerfilAluno, alunoPorSlug, desafioAtivo, submeterDesafio } from "@/lib/dados";
import { logger } from "@/lib/debug";
import { habilidadePermitida } from "@/lib/habilidades";
import { descreverDescartes, type Descarte } from "@/lib/limites";
import { normalizarGithub, normalizarLinkedin } from "@/lib/links";
import { limitar, limparLimite } from "@/lib/rate-limit";
import { hashSenha, verificarSenha } from "@/lib/senha";
import {
  sanitizarMidias,
  sanitizarProjetos,
  sanitizarStickers,
  sanitizarTexto,
  urlSegura,
} from "@/lib/seguranca";
import { abrirAssinado, COOKIE_VISITANTE, opcoesCookie, TRINTA_DIAS } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { MidiaAluno, ProjetoAluno } from "@/lib/tipos";

export type EstadoAcaoCrm = {
  ok: boolean;
  mensagem?: string;
  usuario?: unknown;
};

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const theo = (await alunoPorSlug("theo-padilha")) || (await alunoPorSlug("telor-de-espadilha"));
    if (theo) alunoId = theo.id;
  }

  if (!alunoId) {
    return { ok: false, mensagem: "Perfil de estudante não associado a esta conta." };
  }

  // Rate limit: máx 20 salvamentos por minuto por aluno
  const limit = await limitar(`salvar-perfil:${alunoId}`, 20, 60 * 1000);
  if (!limit.permitido) {
    return {
      ok: false,
      mensagem: "Muitas alterações em pouco tempo. Aguarde alguns instantes antes de salvar novamente.",
    };
  }

  const nome = sanitizarTexto(formData.get("nome"), 100);
  const linkedinBruto = String(formData.get("linkedin") ?? "").trim();
  const githubBruto = String(formData.get("github") ?? "").trim();
  const instagramBruto = String(formData.get("instagram") ?? "").trim();
  const bio = sanitizarTexto(formData.get("bio"), 280);
  const projetosJson = String(formData.get("projetos") ?? "[]");
  const midiasJson = String(formData.get("midias") ?? "[]");
  const stickersJson = String(formData.get("stickers") ?? "[]");

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

  let stickersBrutos: unknown[] = [];
  try {
    stickersBrutos = JSON.parse(stickersJson);
  } catch {
    stickersBrutos = [];
  }

  // Sanitização estrita e validação de URLs / esquemas. O coletor registra o
  // que ficou de fora: antes o item era descartado em silêncio, e o aluno
  // salvava o perfil achando que a foto tinha entrado.
  const descartes: Descarte[] = [];
  const projetos = sanitizarProjetos(projetosBrutos, descartes);
  const midias = sanitizarMidias(midiasBrutas, descartes);
  const stickers = sanitizarStickers(
    stickersBrutos,
    projetos.map((p) => p.id),
    descartes,
  );

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

  const db = clienteAdmin();

  // A troca de senha NÃO acontece aqui: ela exige a senha atual e vive na aba
  // de Segurança (alterarSegurancaAction).
  //
  // A sala TAMBÉM não: ela saiu do payload de propósito. Antes este action lia
  // `sala` do formulário e criava a sala se não existisse, então qualquer aluno
  // logado movia a si mesmo de turma com um POST — e enchia a tabela `salas` de
  // nomes inventados. Quem muda sala é o ADM (mudarSalaDoAlunoAction).

  const dadosAtualizacao: Record<string, unknown> = {
    nome,
    bio: bio || null,
    linkedin,
    github,
    instagram,
    projetos,
    midias,
    stickers,
  };

  try {
    await atualizarPerfilAluno(alunoId, dadosAtualizacao);
    logger.info("CRM", `Perfil atualizado com sucesso: alunoId=${alunoId}, nome=${nome}`);

    // Atualiza a sessão ativa no cookie para refletir o novo nome instantaneamente
    const novaSessao = {
      ...sessao,
      nome,
      email: email || sessao.email,
    };
    const jar = await cookies();
    jar.set(COOKIE_USUARIO, criarTokenSessao(novaSessao), opcoesCookie(TRINTA_DIAS));

    revalidatePath("/");
    revalidatePath("/alunos");
    const aviso = descreverDescartes(descartes);
    return {
      ok: true,
      mensagem: aviso ? `Perfil atualizado. ${aviso}` : "Perfil atualizado com sucesso!",
    };
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
    const senhaAtual = String(formData.get("senhaAtual") ?? "").trim();

    // Sem este limite, exigir a senha atual vira um oráculo de força bruta
    // para quem já tem o cookie de sessão.
    const limit = await limitar(`senha:${sessao.id}`, 5, 5 * 60 * 1000, 15 * 60 * 1000);
    if (!limit.permitido) {
      return { ok: false, mensagem: "Muitas tentativas de troca de senha. Aguarde alguns minutos." };
    }

    if (!senhaAtual) {
      return { ok: false, mensagem: "Informe a sua senha atual para definir uma nova." };
    }
    if (novaSenha.length < 8) {
      return { ok: false, mensagem: "A nova senha deve ter no mínimo 8 caracteres." };
    }
    if (novaSenha !== confirmarSenha) {
      return { ok: false, mensagem: "A confirmação de senha não coincide com a nova senha digitada." };
    }
    if (novaSenha === senhaAtual) {
      return { ok: false, mensagem: "A nova senha precisa ser diferente da atual." };
    }
    if (novaSenha.toLowerCase() === sessao.username.toLowerCase()) {
      return { ok: false, mensagem: "A senha não pode ser igual ao nome de usuário." };
    }

    const { data: conta } = await db
      .from("usuarios")
      .select("senha_hash")
      .eq("id", sessao.id)
      .maybeSingle();

    if (!conta) {
      return { ok: false, mensagem: "Conta não encontrada." };
    }

    const confere = await verificarSenha(senhaAtual, conta.senha_hash);
    if (!confere.ok) {
      logger.warn("AUTH", `Senha atual incorreta na troca de senha: ${sessao.username}`);
      return { ok: false, mensagem: "Senha atual incorreta." };
    }

    const { error: errSenha } = await db
      .from("usuarios")
      .update({ senha_hash: await hashSenha(novaSenha) })
      .eq("id", sessao.id);

    if (errSenha) {
      logger.error("AUTH", "Erro ao atualizar senha no banco", errSenha);
      return { ok: false, mensagem: "Erro ao salvar nova senha no banco de dados." };
    }
    await limparLimite(`senha:${sessao.id}`);
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

/**
 * Apoia uma competência de um estudante (Endorsement).
 *
 * A identidade sai do cookie assinado `sesi.visitante`, igual ao voto de
 * estrela: o botão vive numa página pública anônima, então exigir login
 * removeria a funcionalidade. O que não pode é aceitar `alunoId` e
 * `habilidade` arbitrários do cliente sem nenhuma checagem, como antes — era
 * possível inflar o perfil de qualquer aluno com qualquer string.
 */
export async function apoiarHabilidadeAction(
  alunoId: string,
  habilidade: string,
): Promise<{ ok: boolean; mensagem?: string; votos?: Record<string, number> }> {
  const jar = await cookies();
  const visitante = abrirAssinado(jar.get(COOKIE_VISITANTE)?.value, "visitante");
  if (!visitante) {
    return { ok: false, mensagem: "Recarregue a página para confirmar sua identidade." };
  }

  if (!RE_UUID.test(alunoId)) {
    return { ok: false, mensagem: "Aluno inválido." };
  }

  if (!habilidadePermitida(habilidade)) {
    return { ok: false, mensagem: "Competência não reconhecida." };
  }

  const sessao = await obterSessao();
  if (sessao?.alunoId === alunoId) {
    return { ok: false, mensagem: "Você não pode apoiar o próprio perfil." };
  }

  const limit = await limitar(`endosso:${visitante}`, 20, 60 * 1000);
  if (!limit.permitido) {
    return { ok: false, mensagem: "Muitos apoios em pouco tempo. Aguarde um instante." };
  }

  try {
    const res = await apoiarHabilidade(alunoId, habilidade, visitante);
    revalidatePath("/");
    revalidatePath("/alunos");
    return { ok: true, votos: res.votos };
  } catch (err) {
    return { ok: false, mensagem: err instanceof Error ? err.message : "Erro ao apoiar competência" };
  }
}

/** Submete uma criação a um desafio do mural de hackathons SESI */
export async function submeterDesafioAction(
  _prev: EstadoAcaoCrm,
  formData: FormData,
): Promise<EstadoAcaoCrm> {
  const sessao = await obterSessao();
  if (!sessao) {
    return { ok: false, mensagem: "Faça login no CRM para submeter seu projeto ao desafio." };
  }

  const desafioId = String(formData.get("desafioId") ?? "");
  const tituloProjeto = sanitizarTexto(formData.get("tituloProjeto"), 100);
  const linkBruto = String(formData.get("linkProjeto") ?? "").trim();
  const descricao = sanitizarTexto(formData.get("descricao"), 500);

  if (!desafioId || !tituloProjeto || !descricao) {
    return { ok: false, mensagem: "Preencha todos os campos obrigatórios da submissão." };
  }

  // Recusa link presente mas inválido, em vez de gravar a string crua.
  const linkProjeto = urlSegura(linkBruto);
  if (linkBruto && !linkProjeto) {
    return { ok: false, mensagem: "Informe um link http(s) válido para o projeto." };
  }

  const limit = await limitar(`submeter:${sessao.id}`, 5, 60 * 60 * 1000, 60 * 60 * 1000);
  if (!limit.permitido) {
    return { ok: false, mensagem: "Você já submeteu vários projetos nesta hora. Tente mais tarde." };
  }

  const desafio = await desafioAtivo(desafioId);
  if (!desafio) {
    return { ok: false, mensagem: "Desafio não encontrado ou já encerrado." };
  }

  let alunoId = sessao.alunoId;
  if (!alunoId && sessao.role === "super_adm") {
    const theo = (await alunoPorSlug("theo-padilha")) || (await alunoPorSlug("telor-de-espadilha"));
    if (theo) alunoId = theo.id;
  }

  if (!alunoId) {
    return { ok: false, mensagem: "Perfil de estudante não encontrado." };
  }

  try {
    await submeterDesafio({
      desafioId,
      alunoId,
      alunoNome: sessao.nome ?? sessao.username,
      alunoSala: sessao.sala ?? "DSM3",
      tituloProjeto,
      linkProjeto: linkProjeto ?? undefined,
      descricao,
    });

    revalidatePath("/");
    return { ok: true, mensagem: "Projeto submetido com sucesso ao Desafio SESI Joinville! Parabéns pela iniciativa!" };
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "";
    if (mensagem.includes("23505") || mensagem.includes("submissoes_unica_por_aluno")) {
      return { ok: false, mensagem: "Você já submeteu um projeto para este desafio." };
    }
    return { ok: false, mensagem: mensagem || "Falha ao enviar submissão." };
  }
}

