import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { alunoPorId, alunoPorSlug } from "./dados";
import { logger } from "./debug";
import {
  compararTempoConstante,
  resetarRateLimit,
  sanitizarTexto,
  verificarRateLimit,
} from "./seguranca";
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

export const COOKIE_USUARIO = "sesi.usuario";
const SALT_PADRAO = "sesi_salt_2026";

export function hashSenha(senha: string): string {
  return createHash("sha256")
    .update(`${SALT_PADRAO}:${senha}`)
    .digest("hex");
}

/** Cria token de sessão assinado contendo dados do usuário */
export function criarTokenSessao(dados: UsuarioSessao): string {
  const json = JSON.stringify(dados);
  const base64 = Buffer.from(json).toString("base64url");
  return assinar(base64);
}

/** Abre e decodifica a sessão a partir do cookie assinado */
export async function obterSessao(): Promise<UsuarioSessao | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_USUARIO)?.value;
  if (!token) return null;

  const base64 = abrirAssinado(token);
  if (!base64) return null;

  try {
    const json = Buffer.from(base64, "base64url").toString("utf-8");
    const sessao = JSON.parse(json) as UsuarioSessao;
    return sessao;
  } catch {
    return null;
  }
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

  // Proteção contra brute-force: máximo 5 tentativas por usuário a cada 5 minutos
  const limit = verificarRateLimit(`login:${username}`, 5, 5 * 60 * 1000, 5 * 60 * 1000);
  if (!limit.permitido) {
    logger.warn("AUTH", `Tentativa de login bloqueada por rate limit para o usuário: ${username}`);
    const minutos = Math.ceil((limit.tempoRestanteMs ?? 60000) / 60000);
    return {
      ok: false,
      mensagem: `Muitas tentativas seguidas. Aguarde ${minutos} minuto(s) antes de tentar novamente.`,
    };
  }

  // Atalho do Super ADM theo1234
  if (username === "theo1234" && senha === "theo1234") {
    resetarRateLimit(`login:${username}`);
    logger.info("AUTH", "Login efetuado com sucesso como Super ADM theo1234");
    let aluno = (await alunoPorSlug("theo-padilha")) || (await alunoPorId("a1417080-b591-4cc9-8558-5650a3da0546"));

    const superAdmSessao: UsuarioSessao = {
      id: "c4bb2876-ea82-4cda-8ac7-d06cdc79875e",
      username: "theo1234",
      role: "super_adm",
      alunoId: aluno ? aluno.id : "a1417080-b591-4cc9-8558-5650a3da0546",
      nome: aluno ? aluno.nome : "Theo Padilha",
      sala: "DSM3",
      email: "theopadilha2009@gmail.com",
    };

    const jar = await cookies();
    jar.set(COOKIE_USUARIO, criarTokenSessao(superAdmSessao), opcoesCookie(TRINTA_DIAS));
    jar.set(COOKIE_ADM, crachaAdm(), opcoesCookie(TRINTA_DIAS));
    return { ok: true, usuario: superAdmSessao };
  }

  // Consulta no banco de dados com cliente administrativo isolado
  const db = clienteAdmin();
  const hash = hashSenha(senha);

  const { data: usuarioDb, error } = await db
    .from("usuarios")
    .select("id,username,role,aluno_id,senha_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !usuarioDb) {
    logger.warn("AUTH", `Falha no login: usuário não encontrado (${username})`);
    return { ok: false, mensagem: "Usuário ou senha incorretos." };
  }

  // Comparação em tempo constante (evita timing attacks)
  if (!compararTempoConstante(usuarioDb.senha_hash, hash)) {
    logger.warn("AUTH", `Falha no login: senha incorreta para ${username}`);
    return { ok: false, mensagem: "Usuário ou senha incorretos." };
  }

  // Sucesso: reseta contador de tentativas
  resetarRateLimit(`login:${username}`);
  logger.info("AUTH", `Usuário autenticado com sucesso: ${username} (role: ${usuarioDb.role})`);

  let nome = usuarioDb.username;
  let sala = null;
  let email = usuarioDb.username === "theo1234" ? "theopadilha2009@gmail.com" : `${usuarioDb.username}@aluno.sesisp.org.br`;
  if (usuarioDb.aluno_id) {
    const aluno = await alunoPorId(usuarioDb.aluno_id);
    if (aluno) {
      nome = aluno.nome;
    }
  }

  const sessao: UsuarioSessao = {
    id: usuarioDb.id,
    username: usuarioDb.username,
    role: usuarioDb.role,
    alunoId: usuarioDb.aluno_id,
    nome,
    sala,
    email,
  };

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

  // Rate limit de novos cadastros (máx 10 por minuto global para prevenir spam)
  const limit = verificarRateLimit("cadastro:global", 10, 60 * 1000);
  if (!limit.permitido) {
    return { ok: false, mensagem: "Muitos cadastros recentes. Aguarde 1 minuto." };
  }

  // Validação de formato do username: alfanumérico com ponto, underline ou hífen
  if (!/^[a-z0-9_.-]{3,30}$/.test(username)) {
    return {
      ok: false,
      mensagem: "O nome de usuário deve ter entre 3 e 30 caracteres (letras, números, '.', '_' ou '-').",
    };
  }
  if (senha.length < 4 || senha.length > 100) {
    return { ok: false, mensagem: "A senha deve ter entre 4 e 100 caracteres." };
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

  // Garante a sala
  let salaId: string;
  const { data: salaAchada } = await db
    .from("salas")
    .select("id")
    .eq("nome", salaNome)
    .maybeSingle();

  if (salaAchada) {
    salaId = salaAchada.id;
  } else {
    const { data: novaSala, error: erroSala } = await db
      .from("salas")
      .insert({ nome: salaNome })
      .select("id")
      .single();
    if (erroSala || !novaSala) {
      return { ok: false, mensagem: "Erro ao registrar a sala informada." };
    }
    salaId = novaSala.id;
  }

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
    })
    .select("id")
    .single();

  if (erroAluno || !novoAluno) {
    return { ok: false, mensagem: `Erro ao criar perfil de estudante: ${erroAluno?.message}` };
  }

  // Cria o usuário
  const hash = hashSenha(senha);
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
    return { ok: false, mensagem: `Erro ao cadastrar usuário: ${erroUsuario?.message}` };
  }

  const sessao: UsuarioSessao = {
    id: novoUsuario.id,
    username: novoUsuario.username,
    role: novoUsuario.role,
    alunoId: novoUsuario.aluno_id,
    nome,
    sala: salaNome,
  };

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
