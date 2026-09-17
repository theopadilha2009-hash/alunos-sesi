-- 001_schema.sql — alunos-sesi
-- Salas, alunos, votos (estrelas), RLS e o contador de estrelas.
--
-- Aplicar:  ./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql
--           ./scripts/db-query.sh --psql    --force -f src/sql/001_schema.sql
--
-- O --force e por um falso positivo do lint: a regra "UPDATE sem WHERE" casa
-- com o `before update on` do create trigger abaixo. Nao ha UPDATE de tabela
-- inteira aqui — os dois updates do trigger tem WHERE por id.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- salas — a turma. "3ºA", "2ºB".
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.salas (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique check (length(btrim(nome)) between 1 and 40),
  curso     text,
  turno     text,
  ordem     int  not null default 0,
  criado_em timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- alunos
--
-- linkedin guarda a URL canonica (https://www.linkedin.com/in/<handle>) e
-- github guarda so o handle, sem @ e sem URL: sao coisas diferentes e o
-- formato guardado segue o que a gente devolve na tela.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.alunos (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(btrim(nome)) between 2 and 120),
  slug          text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  sala_id       uuid references public.salas(id) on delete set null,
  linkedin      text,
  github        text,
  bio           text check (bio is null or length(bio) <= 280),
  foto_url      text,
  fixado        boolean not null default false,
  destaque      boolean not null default false,
  estrelas      int not null default 0 check (estrelas >= 0),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint linkedin_url check (
    linkedin is null
    or linkedin ~ '^https://(www\.)?linkedin\.com/in/[A-Za-z0-9\-_%]{1,100}/?$'
  ),
  constraint github_handle check (
    github is null
    or github ~ '^[A-Za-z0-9]([A-Za-z0-9-]{0,37}[A-Za-z0-9])?$'
  )
);

create index if not exists alunos_sala_idx     on public.alunos (sala_id);
create index if not exists alunos_estrelas_idx on public.alunos (estrelas desc);
create index if not exists alunos_fixado_idx   on public.alunos (fixado) where fixado;

-- ─────────────────────────────────────────────────────────────────────────
-- votos — 1 estrela por navegador por aluno.
--
-- visitante_id vem de um cookie ASSINADO httpOnly, escrito pelo middleware.
-- O navegador nao consegue forjar nem escolher o proprio id, entao o
-- "1 por pessoa" e real e nao depende de boa vontade do cliente.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.votos (
  aluno_id     uuid not null references public.alunos(id) on delete cascade,
  visitante_id text not null check (visitante_id ~ '^[a-f0-9]{32}$'),
  criado_em    timestamptz not null default now(),
  primary key (aluno_id, visitante_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Contadores derivados.
-- ─────────────────────────────────────────────────────────────────────────

-- estrelas: coluna mantida por trigger. Contar linhas de votos a cada
-- listagem custaria uma agregacao por render, e dois votos simultaneos
-- poderiam se perder num read-modify-write feito pela aplicacao.
create or replace function public.sync_estrelas() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.alunos set estrelas = estrelas + 1 where id = new.aluno_id;
  elsif tg_op = 'DELETE' then
    update public.alunos set estrelas = greatest(estrelas - 1, 0) where id = old.aluno_id;
  end if;
  return null;
end;
$$;

drop trigger if exists votos_sync on public.votos;
create trigger votos_sync
  after insert or delete on public.votos
  for each row execute function public.sync_estrelas();

create or replace function public.touch_atualizado() returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists alunos_touch on public.alunos;
create trigger alunos_touch
  before update on public.alunos
  for each row execute function public.touch_atualizado();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS
--
-- Leitura publica para anon (a vitrine e publica). Escrita em alunos/salas:
-- ninguem, nem anon nem authenticated — so service_role, que e usado
-- exclusivamente nas rotas de servidor depois de checar o cookie do ADM.
--
-- votos nao tem NENHUMA policy: anon nao le, nao insere e nao apaga. Quem
-- vota e a rota /api/estrela, no servidor, com service_role.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.salas  enable row level security;
alter table public.alunos enable row level security;
alter table public.votos  enable row level security;

drop policy if exists salas_leitura  on public.salas;
drop policy if exists alunos_leitura on public.alunos;
drop policy if exists votos_leitura  on public.votos;
drop policy if exists votos_insere   on public.votos;
drop policy if exists votos_apaga    on public.votos;

create policy salas_leitura  on public.salas  for select to anon, authenticated using (true);
create policy alunos_leitura on public.alunos for select to anon, authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Analise da turma — agregacao no banco, nao no browser.
-- security_invoker: a view respeita a RLS de quem consulta.
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.retrato_salas
with (security_invoker = true) as
select
  s.id,
  s.nome,
  s.curso,
  s.turno,
  s.ordem,
  count(a.id)::int                                        as alunos,
  count(a.linkedin)::int                                  as com_linkedin,
  count(a.github)::int                                    as com_github,
  coalesce(sum(a.estrelas), 0)::int                       as estrelas,
  case
    when count(a.id) = 0 then 0
    else round(
      100.0 * (count(a.linkedin) + count(a.github)) / (2 * count(a.id))
    )::int
  end                                                     as completude
from public.salas s
left join public.alunos a on a.sala_id = s.id
group by s.id, s.nome, s.curso, s.turno, s.ordem;
