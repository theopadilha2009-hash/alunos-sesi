import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { alunoPorId, alunoPorSlug } from "./dados";
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

  // Atalho do Super ADM theo1234
  if (username === "theo1234" && senha === "theo1234") {
    let aluno = await alunoPorSlug("telor-de-espadilha");

    const superAdmSessao: UsuarioSessao = {
      id: "super-adm-theo1234",
      username: "theo1234",
      role: "super_adm",
      alunoId: aluno ? aluno.id : null,
      nome: aluno ? aluno.nome : "Telor de Espadilha",
      sala: "DSM3",
    };

    const jar = await cookies();
    jar.set(COOKIE_USUARIO, criarTokenSessao(superAdmSessao), opcoesCookie(TRINTA_DIAS));
    jar.set(COOKIE_ADM, crachaAdm(), opcoesCookie(TRINTA_DIAS));
    return { ok: true, usuario: superAdmSessao };
  }

  // Consulta no banco de dados
  const db = clienteAdmin();
  const hash = hashSenha(senha);

  const { data: usuarioDb, error } = await db
    .from("usuarios")
    .select("id,username,role,aluno_id,senha_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !usuarioDb) {
    return { ok: false, mensagem: "Usuário ou senha incorretos." };
  }

  if (usuarioDb.senha_hash !== hash) {
    return { ok: false, mensagem: "Usuário ou senha incorretos." };
  }

  let nome = usuarioDb.username;
  let sala = null;
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
  };

  const jar = await cookies();
  jar.set(COOKIE_USUARIO, criarTokenSessao(sessao), opcoesCookie(TRINTA_DIAS));
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
  const nome = dados.nome.trim();
  const salaNome = dados.salaNome.trim();

  if (username.length < 3) {
    return { ok: false, mensagem: "O nome de usuário deve ter pelo menos 3 caracteres." };
  }
  if (senha.length < 4) {
    return { ok: false, mensagem: "A senha deve ter pelo menos 4 caracteres." };
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
}
