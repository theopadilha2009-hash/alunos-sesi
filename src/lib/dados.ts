import { clienteAdmin } from "./supabase/admin";
import { clientePublico } from "./supabase/publico";
import type { Aluno, RetratoSala, Sala } from "./tipos";

/**
 * A única ponte entre a tela e o Supabase.
 *
 * Leitura pública sai pelo cliente anon (passa pela RLS de propósito).
 * O que a RLS esconde do anon — os votos, que não têm policy nenhuma — é
 * lido pelo cliente admin, sempre filtrado pelo id que veio do cookie
 * assinado. Nunca aceite esse id vindo do corpo de um request.
 */

const CAMPOS_ALUNO =
  "id,nome,slug,sala_id,linkedin,github,bio,foto_url,fixado,destaque,estrelas";

export async function listarSalas(): Promise<Sala[]> {
  const { data, error } = await clientePublico()
    .from("salas")
    .select("id,nome,curso,turno,ordem")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) throw new Error(`listarSalas: ${error.message}`);
  return (data ?? []) as Sala[];
}

export async function listarAlunos(): Promise<Aluno[]> {
  const { data, error } = await clientePublico()
    .from("alunos")
    .select(CAMPOS_ALUNO)
    .order("nome", { ascending: true });
  if (error) throw new Error(`listarAlunos: ${error.message}`);
  return (data ?? []) as Aluno[];
}

export async function listarRetrato(): Promise<RetratoSala[]> {
  const { data, error } = await clientePublico()
    .from("retrato_salas")
    .select("id,nome,curso,turno,ordem,alunos,com_linkedin,com_github,estrelas,completude");
  if (error) throw new Error(`listarRetrato: ${error.message}`);
  return (data ?? []) as RetratoSala[];
}

export async function alunoPorSlug(slug: string): Promise<Aluno | null> {
  const { data, error } = await clientePublico()
    .from("alunos")
    .select(CAMPOS_ALUNO)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`alunoPorSlug: ${error.message}`);
  return (data as Aluno) ?? null;
}

/** Os ids que ESTE navegador já estrelou. Depende do cookie assinado. */
export async function votosDoVisitante(visitante: string): Promise<string[]> {
  if (!visitante) return [];
  const { data, error } = await clienteAdmin()
    .from("votos")
    .select("aluno_id")
    .eq("visitante_id", visitante);
  if (error) throw new Error(`votosDoVisitante: ${error.message}`);
  return (data ?? []).map((v) => v.aluno_id as string);
}
