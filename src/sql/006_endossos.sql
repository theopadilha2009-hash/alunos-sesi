-- 006_endossos.sql — Endosso de competência (tabela endossos)
-- Uma linha por (aluno, habilidade, endossante). O contador em
-- alunos.habilidades_votos passa a ser derivado daqui, mantido por trigger.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. A tabela
--
-- Mesmo desenho de public.votos: a linha é a verdade e o número no perfil é
-- cache. `on conflict do nothing` na aplicação garante 1 endosso por navegador
-- por habilidade, e como nenhuma linha entra na segunda tentativa, o trigger
-- não dispara e o contador não anda duas vezes.
--
-- A allowlist de habilidade repete exatamente os nomes de LISTA_HABILIDADES em
-- src/lib/habilidades.ts. A comparação é POR IGUALDADE, não case-insensitive:
-- a PK trata 'Python' e 'python' como habilidades distintas, e o app valida
-- com `habilidadePermitida` (comparação exata) antes de chegar aqui. Se um lado
-- ganhar uma competência nova, o outro precisa ganhar junto.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.endossos (
  aluno_id    uuid not null references public.alunos(id) on delete cascade,
  habilidade  text not null check (habilidade in (
    'Robótica',
    'Python',
    'Web Frontend',
    'Backend & SQL',
    'Hardware & IoT',
    'Design & UI/UX',
    'IA & Dados',
    'C++ & Embarcados',
    'Modelagem 3D',
    'Mobile'
  )),
  -- Mesmo formato do id de visitante assinado em src/lib/sessao.ts
  -- (randomBytes(16).toString('hex')). É o que amarra o endosso a um navegador
  -- sem exigir login, igual ao voto.
  endossante  text not null check (endossante ~ '^[a-f0-9]{32}$'),
  criado_em   timestamptz not null default now(),
  primary key (aluno_id, habilidade, endossante)
);

-- A PK cobre (aluno_id, habilidade, ...) e serve para o perfil. O caminho
-- inverso — "quais endossos este navegador já deu" — não tem índice pela PK.
create index if not exists endossos_endossante_idx on public.endossos (endossante);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. habilidades_votos como cache do trigger
--
-- O perfil lê um jsonb `{ "Python": 3 }` para não ter que agregar por render.
-- Sem esta trigger a coluna fica parada em '{}' — que era exatamente o estado
-- do banco antes deste arquivo.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sync_endossos() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_atual int;
begin
  if tg_op = 'INSERT' then
    select coalesce((habilidades_votos ->> new.habilidade)::int, 0)
      into v_atual
      from public.alunos
     where id = new.aluno_id;

    update public.alunos
       set habilidades_votos = jsonb_set(
             coalesce(habilidades_votos, '{}'::jsonb),
             array[new.habilidade],
             to_jsonb(coalesce(v_atual, 0) + 1),
             true
           )
     where id = new.aluno_id;

  elsif tg_op = 'DELETE' then
    select coalesce((habilidades_votos ->> old.habilidade)::int, 0)
      into v_atual
      from public.alunos
     where id = old.aluno_id;

    -- Chega a zero: a chave sai do objeto em vez de virar {"Python": 0}. Um
    -- contador zerado no jsonb faz a UI renderizar a competência com 0 apoios
    -- como se existisse.
    if coalesce(v_atual, 0) <= 1 then
      update public.alunos
         set habilidades_votos = coalesce(habilidades_votos, '{}'::jsonb) - old.habilidade
       where id = old.aluno_id;
    else
      update public.alunos
         set habilidades_votos = jsonb_set(
               coalesce(habilidades_votos, '{}'::jsonb),
               array[old.habilidade],
               to_jsonb(v_atual - 1),
               true
             )
       where id = old.aluno_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists endossos_sync on public.endossos;
create trigger endossos_sync
  after insert or delete on public.endossos
  for each row execute function public.sync_endossos();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. RLS e privilégios
--
-- Sem policy nenhuma, igual a public.votos: anon não lê, não insere e não
-- apaga. Quem escreve é src/app/acoes-crm.ts (apoiarHabilidadeAction), no
-- servidor, com service_role e depois de abrir o cookie assinado do visitante.
-- A leitura pública do contador continua saindo de alunos.habilidades_votos,
-- que tem policy de select.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.endossos enable row level security;

drop policy if exists endossos_leitura on public.endossos;
drop policy if exists endossos_insere  on public.endossos;
drop policy if exists endossos_apaga   on public.endossos;

revoke all on public.endossos from anon, authenticated;

-- Trigger não checa privilégio de EXECUTE, mas função no schema public vira
-- endpoint RPC do PostgREST — a revogação tira a rota, não o disparo.
revoke execute on function public.sync_endossos() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Sem backfill de propósito: habilidades_votos estava '{}' em todos os 13
-- alunos quando este arquivo foi escrito, então não havia contagem a preservar.
-- Se este arquivo for aplicado num banco que já tenha contagem manual, ela
-- precisa ser reconciliada à mão antes.
-- ─────────────────────────────────────────────────────────────────────────
