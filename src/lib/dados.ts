import { logger } from "./debug";
import { extrairHabilidades } from "./habilidades";
import { clienteAdmin } from "./supabase/admin";
import { clientePublico } from "./supabase/publico";
import type { Aluno, DesafioHackathon, RetratoSala, Sala, SubmissaoDesafio } from "./tipos";

/**
 * A única ponte entre a tela e o Supabase.
 *
 * Leitura pública sai pelo cliente anon (passa pela RLS de propósito).
 * O que a RLS esconde do anon — os votos, que não têm policy nenhuma — é
 * lido pelo cliente admin, sempre filtrado pelo id que veio do cookie
 * assinado. Nunca aceite esse id vindo do corpo de um request.
 */

const CAMPOS_ALUNO =
  "id,nome,slug,sala_id,linkedin,github,instagram,bio,foto_url,fixado,destaque,estrelas,projetos,midias,stickers,habilidades,habilidades_votos,insignias";

/**
 * Resolve o que a coluna deixa em aberto, para nenhuma tela precisar saber.
 *
 * `habilidades` é nullable sem default de propósito: `null` quer dizer "nunca
 * editou o perfil", e aí a resposta continua sendo o regex da bio — senão todo
 * aluno antigo acordaria sem competência nenhuma no dia do deploy. Array vazio é
 * outra coisa: o aluno abriu o editor e escolheu não ter nenhuma. A diferença só
 * existe aqui; daqui para cima é sempre um array.
 */
function resolverAluno(aluno: Aluno): Aluno {
  return {
    ...aluno,
    habilidades: aluno.habilidades ?? extrairHabilidades(aluno.bio),
  };
}

const TTL_CACHE_MS = 15 * 1000; // 15 segundos para acelerar navegação sem perder atualizações
let cacheSalas: { expira: number; dados: Sala[] } | null = null;
let cacheRetrato: { expira: number; dados: RetratoSala[] } | null = null;

export function limparCacheDados(): void {
  cacheSalas = null;
  cacheRetrato = null;
}

export async function listarSalas(): Promise<Sala[]> {
  const agora = Date.now();
  if (cacheSalas && cacheSalas.expira > agora) {
    return cacheSalas.dados;
  }

  const { data, error } = await clientePublico()
    .from("salas")
    .select("id,nome,curso,turno,ordem")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (error) {
    logger.error("DADOS", "Erro em listarSalas", error);
    throw new Error(`listarSalas: ${error.message}`);
  }

  const salas = (data ?? []) as Sala[];
  cacheSalas = { expira: agora + TTL_CACHE_MS, dados: salas };
  return salas;
}

export async function listarAlunos(): Promise<Aluno[]> {
  const { data, error } = await clientePublico()
    .from("alunos")
    .select(CAMPOS_ALUNO)
    .order("nome", { ascending: true });
  if (error) {
    logger.error("DADOS", "Erro em listarAlunos", error);
    throw new Error(`listarAlunos: ${error.message}`);
  }
  return ((data ?? []) as Aluno[]).map(resolverAluno);
}

export async function listarRetrato(): Promise<RetratoSala[]> {
  const agora = Date.now();
  if (cacheRetrato && cacheRetrato.expira > agora) {
    return cacheRetrato.dados;
  }

  const { data, error } = await clientePublico()
    .from("retrato_salas")
    .select("id,nome,curso,turno,ordem,alunos,com_linkedin,com_github,estrelas,completude");
  if (error) {
    logger.error("DADOS", "Erro em listarRetrato", error);
    throw new Error(`listarRetrato: ${error.message}`);
  }

  const retratos = (data ?? []) as RetratoSala[];
  cacheRetrato = { expira: agora + TTL_CACHE_MS, dados: retratos };
  return retratos;
}

export async function alunoPorSlug(slug: string): Promise<Aluno | null> {
  const { data, error } = await clientePublico()
    .from("alunos")
    .select(CAMPOS_ALUNO)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`alunoPorSlug: ${error.message}`);
  return data ? resolverAluno(data as Aluno) : null;
}

export async function alunoPorId(id: string): Promise<Aluno | null> {
  const { data, error } = await clientePublico()
    .from("alunos")
    .select(CAMPOS_ALUNO)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`alunoPorId: ${error.message}`);
  return data ? resolverAluno(data as Aluno) : null;
}

/** Atualiza dados do perfil de um aluno autenticado */
export async function atualizarPerfilAluno(
  id: string,
  dados: {
    nome?: string;
    linkedin?: string | null;
    github?: string | null;
    instagram?: string | null;
    bio?: string | null;
    foto_url?: string | null;
    projetos?: unknown[];
    midias?: unknown[];
    stickers?: unknown[];
    habilidades?: string[];
    habilidades_votos?: Record<string, number>;
    insignias?: string[];
  },
): Promise<Aluno> {
  const { data, error } = await clienteAdmin()
    .from("alunos")
    .update(dados)
    .eq("id", id)
    .select(CAMPOS_ALUNO)
    .single();

  if (error) {
    logger.error("DADOS", `Erro em atualizarPerfilAluno id=${id}`, error);
    throw new Error(`atualizarPerfilAluno: ${error.message}`);
  }
  limparCacheDados();
  return resolverAluno(data as Aluno);
}

/** Apoia uma competência técnica específica de um colega (Endorsement) */
/**
 * Registra um endosso de habilidade.
 *
 * O contador em `alunos.habilidades_votos` é cache mantido por trigger — quem
 * manda é a linha em `public.endossos`, que tem PK `(aluno_id, habilidade,
 * endossante)`. Isso é o mesmo desenho de `votos`: o `on conflict do nothing`
 * garante 1 endosso por navegador por habilidade, e como nenhuma linha entra,
 * o trigger não dispara e o contador não anda duas vezes.
 */
export async function apoiarHabilidade(
  alunoId: string,
  habilidade: string,
  endossante: string,
): Promise<{ ok: boolean; votos: Record<string, number> }> {
  const db = clienteAdmin();

  const { error: errInsert } = await db
    .from("endossos")
    .upsert(
      { aluno_id: alunoId, habilidade, endossante },
      { onConflict: "aluno_id,habilidade,endossante", ignoreDuplicates: true },
    );

  if (errInsert) {
    throw new Error(`Erro ao registrar apoio: ${errInsert.message}`);
  }

  const { data: aluno, error: errLeitura } = await db
    .from("alunos")
    .select("habilidades_votos")
    .eq("id", alunoId)
    .maybeSingle();

  if (errLeitura || !aluno) {
    throw new Error("Aluno não encontrado para apoio de habilidade.");
  }

  limparCacheDados();
  return { ok: true, votos: (aluno.habilidades_votos ?? {}) as Record<string, number> };
}

/** Diz se o desafio existe e está ativo — usado antes de aceitar uma submissão. */
export async function desafioAtivo(
  id: string,
): Promise<{ id: string; titulo: string } | null> {
  if (!id) return null;
  // Cliente público de propósito: quem valida é a RLS de `desafios`. Se a
  // policy estiver errada, isso aparece na hora em vez de ficar escondido
  // atrás da service_role.
  const { data, error } = await clientePublico()
    .from("desafios")
    .select("id,titulo")
    .eq("id", id)
    .eq("ativo", true)
    .maybeSingle();

  if (error) {
    logger.error("DADOS", "Erro ao consultar desafio", error);
    return null;
  }
  return data ? { id: data.id, titulo: data.titulo } : null;
}

/** Lista todos os desafios e hackathons ativos do SESI Joinville */
export async function listarDesafios(): Promise<DesafioHackathon[]> {
  const { data, error } = await clientePublico()
    .from("desafios")
    .select("id,titulo,subtitulo,categoria,prazo,recompensa,insignia_icone,descricao,criterios,submissoes_count,ativo")
    .order("prazo", { ascending: true });

  if (error) {
    logger.error("DADOS", "Erro ao listar desafios", error);
    return [];
  }

  return (data ?? []).map((d) => ({
    id: d.id,
    titulo: d.titulo,
    subtitulo: d.subtitulo,
    categoria: d.categoria as DesafioHackathon["categoria"],
    prazo: d.prazo,
    recompensa: d.recompensa,
    insigniaIcone: d.insignia_icone,
    descricao: d.descricao,
    criterios: Array.isArray(d.criterios) ? d.criterios : [],
    submissoesCount: d.submissoes_count ?? 0,
    ativo: Boolean(d.ativo),
  }));
}

/** Registra a submissão de um estudante a um desafio técnico */
export async function submeterDesafio(dados: {
  desafioId: string;
  alunoId: string;
  alunoNome: string;
  alunoSala: string;
  tituloProjeto: string;
  linkProjeto?: string;
  descricao: string;
}): Promise<SubmissaoDesafio> {
  const db = clienteAdmin();
  const { data, error } = await db
    .from("submissoes_desafios")
    .insert({
      desafio_id: dados.desafioId,
      aluno_id: dados.alunoId,
      titulo_projeto: dados.tituloProjeto,
      link_projeto: dados.linkProjeto || null,
      descricao: dados.descricao,
    })
    .select("id,desafio_id,aluno_id,titulo_projeto,link_projeto,descricao,aprovado,criado_em")
    .single();

  if (error || !data) {
    logger.error("DADOS", "Erro ao submeter projeto para desafio", error);
    throw new Error(`Erro ao submeter desafio: ${error?.message}`);
  }

  // `desafios.submissoes_count` é mantido por trigger (sync_submissoes_count).
  // Incrementar aqui também dobraria a contagem.

  limparCacheDados();
  return {
    id: data.id,
    desafioId: data.desafio_id,
    alunoId: data.aluno_id,
    alunoNome: dados.alunoNome,
    alunoSala: dados.alunoSala,
    tituloProjeto: data.titulo_projeto,
    linkProjeto: data.link_projeto ?? "",
    descricao: data.descricao,
    aprovado: data.aprovado ?? false,
    criadoEm: data.criado_em,
  };
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
