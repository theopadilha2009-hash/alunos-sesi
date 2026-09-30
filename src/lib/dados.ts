import { logger } from "./debug";
import { extrairHabilidades } from "./habilidades";
import { SENHA_BLOQUEADA } from "./senha";
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
 *
 * O texto cru do PostgREST vai para o `logger.error`; o que sobe daqui é sempre
 * uma frase da casa. `error.message` nomeia tabela, constraint e às vezes o
 * valor da coluna — é diagnóstico para quem lê o log, e o `logger` já o registra
 * com `code` e `hint` junto (`descreverErro`). É o mesmo desenho de `garantirSala`
 * (`src/app/adm/acoes.ts`), e quem trava é a varredura de
 * `tests/erro-interno.test.mjs`.
 */

const CAMPOS_ALUNO =
  "id,nome,slug,sala_id,linkedin,github,instagram,email,bio,foto_url,cor_perfil,banner_url,fixado,destaque,aprovado,estrelas,projetos,midias,stickers,videos,habilidades,habilidades_votos,insignias";

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
    throw new Error("Não foi possível carregar as turmas.");
  }

  const salas = (data ?? []) as Sala[];
  cacheSalas = { expira: agora + TTL_CACHE_MS, dados: salas };
  return salas;
}

/**
 * Lista os alunos, escondendo os pendentes de moderação por padrão.
 *
 * O filtro é PARÂMETRO e não uma regra fixa aqui dentro porque esta função
 * serve a três telas com necessidades opostas: a vitrine pública `/alunos` (só
 * aprovados), a home autenticada (a mesma lista) e o painel `/adm`, que precisa
 * justamente ver quem está esperando aprovação. Filtrar incondicionalmente
 * aqui esconderia do ADM a própria fila que ele tem que despachar.
 *
 * O `.eq` abaixo é o gate de verdade: a policy `alunos_leitura` do anon é
 * `using (true)` (001_schema.sql:137), então a RLS entrega o pendente para quem
 * pedir. Quem esconde é esta linha.
 */
export async function listarAlunos(
  opcoes: { incluirPendentes?: boolean } = {},
): Promise<Aluno[]> {
  const consulta = clientePublico()
    .from("alunos")
    .select(CAMPOS_ALUNO)
    .order("nome", { ascending: true });

  const { data, error } = await (opcoes.incluirPendentes
    ? consulta
    : consulta.eq("aprovado", true));

  if (error) {
    logger.error("DADOS", "Erro em listarAlunos", error);
    throw new Error("Não foi possível carregar a lista de alunos.");
  }
  return ((data ?? []) as Aluno[]).map(resolverAluno);
}

/**
 * Os `aluno_id` que já têm login utilizável — senha de verdade, não o
 * `!bloqueado` da conta que só espera o código de ativação.
 *
 * Só o painel do ADM consulta: a vitrine não tem por que saber de contas. É o
 * que deixa o botão de emitir código aparecer apenas para quem ainda não tem
 * acesso — a ação recusaria de qualquer forma, mas o ADM não precisa clicar
 * para descobrir.
 *
 * `usuarios` não tem policy nenhuma, então a leitura sai pelo cliente admin.
 */
export async function listarAcessos(): Promise<string[]> {
  const { data, error } = await clienteAdmin()
    .from("usuarios")
    .select("aluno_id")
    .not("aluno_id", "is", null)
    .neq("senha_hash", SENHA_BLOQUEADA);

  if (error) {
    logger.error("DADOS", "Erro em listarAcessos", error);
    throw new Error("Não foi possível carregar quem já tem acesso.");
  }
  return (data ?? []).map((u) => u.aluno_id as string);
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
    throw new Error("Não foi possível carregar o retrato das turmas.");
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
  if (error) {
    logger.error("DADOS", `Erro em alunoPorSlug slug=${slug}`, error);
    throw new Error("Não foi possível carregar o perfil.");
  }
  return data ? resolverAluno(data as Aluno) : null;
}

export async function alunoPorId(id: string): Promise<Aluno | null> {
  const { data, error } = await clientePublico()
    .from("alunos")
    .select(CAMPOS_ALUNO)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    logger.error("DADOS", `Erro em alunoPorId id=${id}`, error);
    throw new Error("Não foi possível carregar o perfil.");
  }
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
    cor_perfil?: string | null;
    banner_url?: string | null;
    projetos?: unknown[];
    midias?: unknown[];
    stickers?: unknown[];
    videos?: unknown[];
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
    throw new Error("Não foi possível salvar o perfil.");
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
    logger.error("DADOS", `Erro ao registrar apoio de "${habilidade}"`, errInsert);
    throw new Error("Não foi possível registrar o apoio.");
  }

  const { data: aluno, error: errLeitura } = await db
    .from("alunos")
    .select("habilidades_votos")
    .eq("id", alunoId)
    .maybeSingle();

  // Os dois casos eram uma condição só, e o erro de leitura saía rotulado como
  // "aluno não encontrado" — uma causa errada no lugar do diagnóstico. Separados:
  // a falha de banco vai para o log, e só a ausência de linha é o que diz.
  if (errLeitura) {
    logger.error("DADOS", `Erro ao reler habilidades_votos id=${alunoId}`, errLeitura);
    throw new Error("Não foi possível registrar o apoio.");
  }
  if (!aluno) {
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
  // `upsert` e não `insert`: `submissoes_unica_por_aluno` (005:57) só permite
  // uma linha por par aluno+desafio, e o aluno cujo envio foi rejeitado precisa
  // poder corrigir e reenviar — é o que dá consequência ao "Rejeitar" em vez de
  // deixá-lo como carimbo sem saída.
  //
  // `aprovado: null` explícito: o reenvio volta para a fila. Sem isto a linha
  // corrigida continuaria carregando a rejeição antiga, e o ADM não a veria
  // de novo. `null` é o estado pendente desde a 016 — a coluna não tem mais
  // default.
  const { data, error } = await db
    .from("submissoes_desafios")
    .upsert(
      {
        desafio_id: dados.desafioId,
        aluno_id: dados.alunoId,
        titulo_projeto: dados.tituloProjeto,
        link_projeto: dados.linkProjeto || null,
        descricao: dados.descricao,
        aprovado: null,
      },
      { onConflict: "desafio_id,aluno_id" },
    )
    .select("id,desafio_id,aluno_id,titulo_projeto,link_projeto,descricao,aprovado,criado_em")
    .single();

  if (error || !data) {
    logger.error("DADOS", "Erro ao submeter projeto para desafio", error);
    throw new Error("Não foi possível enviar o projeto.");
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
    aprovado: data.aprovado ?? null,
    criadoEm: data.criado_em,
  };
}

/**
 * Todos os envios, para o ADM julgar.
 *
 * O nome do aluno e o título do desafio vêm no mesmo `select`: a tabela guarda
 * só os ids, e resolvê-los linha a linha seria uma consulta por envio. O
 * embedding do PostgREST usa as FKs que a 004 criou.
 */
export async function listarSubmissoes(): Promise<SubmissaoDesafio[]> {
  const { data, error } = await clienteAdmin()
    .from("submissoes_desafios")
    .select(
      "id,desafio_id,aluno_id,titulo_projeto,link_projeto,descricao,aprovado,criado_em,alunos(nome,salas(nome)),desafios(titulo)",
    )
    .order("criado_em", { ascending: false });

  if (error) {
    logger.error("DADOS", "Erro ao listar submissões", error);
    return [];
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    desafioId: s.desafio_id,
    alunoId: s.aluno_id,
    // Aluno apagado leva as submissões junto (`on delete cascade`), então o
    // nulo aqui só aparece se o embedding vier vazio por outro motivo.
    alunoNome: (s.alunos as { nome?: string } | null)?.nome ?? "Aluno removido",
    // O embedding aninhado (alunos → salas) usa a FK `alunos.sala_id`. Turma
    // nula é aluno sem sala — a fila mostra "—" nesse caso.
    alunoSala:
      (s.alunos as { salas?: { nome?: string } | null } | null)?.salas?.nome ?? "",
    tituloProjeto: s.titulo_projeto,
    linkProjeto: s.link_projeto ?? "",
    descricao: s.descricao,
    // Tri-estado preservado: coagir com `Boolean()` transformaria "pendente"
    // e "rejeitado" no mesmo `false`, que é o bug que a 016 desfaz.
    aprovado: s.aprovado ?? null,
    criadoEm: s.criado_em,
    desafioTitulo: (s.desafios as { titulo?: string } | null)?.titulo ?? "",
  }));
}

/** Os envios deste aluno, para o mural mostrar onde cada um parou. */
export async function submissoesDoAluno(alunoId: string): Promise<SubmissaoDesafio[]> {
  if (!alunoId) return [];

  const { data, error } = await clienteAdmin()
    .from("submissoes_desafios")
    .select("id,desafio_id,aluno_id,titulo_projeto,link_projeto,descricao,aprovado,criado_em")
    .eq("aluno_id", alunoId)
    .order("criado_em", { ascending: false });

  if (error) {
    logger.error("DADOS", "Erro ao listar submissões do aluno", error);
    return [];
  }

  return (data ?? []).map((s) => ({
    id: s.id,
    desafioId: s.desafio_id,
    alunoId: s.aluno_id,
    alunoNome: "",
    alunoSala: "",
    tituloProjeto: s.titulo_projeto,
    linkProjeto: s.link_projeto ?? "",
    descricao: s.descricao,
    // Tri-estado preservado: coagir com `Boolean()` transformaria "pendente"
    // e "rejeitado" no mesmo `false`, que é o bug que a 016 desfaz.
    aprovado: s.aprovado ?? null,
    criadoEm: s.criado_em,
  }));
}

/**
 * Aprova ou rejeita um envio.
 *
 * O gate de quem pode chamar isto está na Server Action (`exigirAdm`), não
 * aqui — este módulo não conhece sessão.
 */
export async function decidirSubmissao(id: string, aprovado: boolean): Promise<boolean> {
  const { error } = await clienteAdmin()
    .from("submissoes_desafios")
    .update({ aprovado })
    .eq("id", id);

  if (error) {
    logger.error("DADOS", "Erro ao decidir submissão", error);
    return false;
  }
  limparCacheDados();
  return true;
}

/** Os ids já usados, para o novo desafio nascer com um livre. */
export async function idsDeDesafios(): Promise<string[]> {
  const { data, error } = await clienteAdmin().from("desafios").select("id");
  if (error) {
    logger.error("DADOS", "Erro ao listar ids de desafios", error);
    return [];
  }
  return (data ?? []).map((d) => d.id as string);
}

/** Publica um desafio no mural. Sem `aprovado`: desafio não passa por fila. */
export async function publicarDesafio(dados: {
  id: string;
  titulo: string;
  subtitulo: string;
  categoria: string;
  prazo: string;
  recompensa: string;
  descricao: string;
  criterios: string[];
}): Promise<{ ok: true } | { ok: false; duplicado: boolean }> {
  const { error } = await clienteAdmin()
    .from("desafios")
    .insert({
      id: dados.id,
      titulo: dados.titulo,
      subtitulo: dados.subtitulo,
      categoria: dados.categoria,
      prazo: dados.prazo,
      recompensa: dados.recompensa,
      // Sem seletor de ícone na tela: o card tem um enfeite fixo e a coluna é
      // `not null`. Fica registrado se um dia houver escolha.
      insignia_icone: "trofeu",
      descricao: dados.descricao,
      criterios: dados.criterios,
    });

  if (error) {
    logger.error("DADOS", "Erro ao publicar desafio", error);
    return { ok: false, duplicado: error.code === "23505" };
  }
  limparCacheDados();
  return { ok: true };
}

/** Os ids que ESTE navegador já estrelou. Depende do cookie assinado. */
export async function votosDoVisitante(visitante: string): Promise<string[]> {
  if (!visitante) return [];
  const { data, error } = await clienteAdmin()
    .from("votos")
    .select("aluno_id")
    .eq("visitante_id", visitante);
  if (error) {
    logger.error("DADOS", "Erro em votosDoVisitante", error);
    throw new Error("Não foi possível carregar os votos deste navegador.");
  }
  return (data ?? []).map((v) => v.aluno_id as string);
}
