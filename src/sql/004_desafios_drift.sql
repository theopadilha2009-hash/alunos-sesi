-- 004_desafios_drift.sql — Mural de desafios versionado
-- public.desafios e public.submissoes_desafios existiam só em produção: não
-- havia DDL nenhuma no repositório. Isto fecha o drift e tranca a leitura das
-- submissões, que estava aberta para a anon key.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. public.desafios
--
-- As colunas abaixo foram copiadas de information_schema no banco vivo. Como a
-- tabela já existe, o `create table if not exists` é no-op hoje — ele está aqui
-- para o banco poder ser reconstruído a partir do repositório, que é o ponto
-- do arquivo.
--
-- `id` é text e não tem default: quem insere manda o id. `prazo` também é text
-- (deveria ser date, mas migrar agora exigiria converter o que já está gravado;
-- fica registrado como dívida).
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.desafios (
  id               text primary key,
  titulo           text not null,
  subtitulo        text not null,
  categoria        text not null,
  prazo            text not null,
  recompensa       text not null,
  insignia_icone   text not null default 'trofeu',
  descricao        text not null,
  criterios        jsonb not null default '[]'::jsonb,
  submissoes_count integer not null default 0,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now(),
  constraint desafios_criterios_forma check (jsonb_typeof(criterios) = 'array'),
  constraint desafios_submissoes_count_check check (submissoes_count >= 0)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. public.submissoes_desafios
--
-- Nome das FKs mantido igual ao que já existe em produção, para o arquivo ser
-- idempotente num banco novo e num banco que já tem as constraints.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.submissoes_desafios (
  id             uuid primary key default gen_random_uuid(),
  desafio_id     text not null references public.desafios(id) on delete cascade,
  aluno_id       uuid not null references public.alunos(id) on delete cascade,
  titulo_projeto text not null,
  link_projeto   text,
  descricao      text not null,
  aprovado       boolean default false,
  criado_em      timestamptz not null default now(),
  -- Mesmos tetos de src/lib/seguranca.ts (sanitizarTexto): sem eles um insert
  -- direto pelo PostgREST grava um romance na coluna.
  constraint submissoes_titulo_check    check (length(btrim(titulo_projeto)) between 1 and 100),
  constraint submissoes_descricao_check check (length(btrim(descricao)) between 1 and 500),
  -- Link é opcional, mas quando existe tem que ser http(s) — a mesma regra que
  -- `urlSegura` aplica na entrada.
  constraint submissoes_link_check
    check (link_projeto is null or link_projeto ~ '^https?://')
);

-- Postgres não indexa FK sozinho: sem estes dois, toda listagem de submissões
-- por desafio vira varredura da tabela.
create index if not exists submissoes_desafios_desafio_idx on public.submissoes_desafios (desafio_id);
create index if not exists submissoes_desafios_aluno_idx   on public.submissoes_desafios (aluno_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. As constraints dos blocos acima, num banco que JÁ tem as tabelas
--
-- As duas já existem em produção, então o `create table if not exists` do topo
-- é pulado e as constraints de lá nunca chegam ao banco vivo — ficariam só no
-- arquivo, que é o oposto do objetivo. Estes `alter table` explícitos fazem o
-- banco existente convergir para o mesmo desenho.
--
-- Não há `add constraint if not exists` no Postgres: o guardião é o pg_constraint.
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'desafios_criterios_forma'
                    and conrelid = 'public.desafios'::regclass) then
    alter table public.desafios
      add constraint desafios_criterios_forma check (jsonb_typeof(criterios) = 'array');
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'desafios_submissoes_count_check'
                    and conrelid = 'public.desafios'::regclass) then
    alter table public.desafios
      add constraint desafios_submissoes_count_check check (submissoes_count >= 0);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'submissoes_titulo_check'
                    and conrelid = 'public.submissoes_desafios'::regclass) then
    alter table public.submissoes_desafios
      add constraint submissoes_titulo_check
      check (length(btrim(titulo_projeto)) between 1 and 100);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'submissoes_descricao_check'
                    and conrelid = 'public.submissoes_desafios'::regclass) then
    alter table public.submissoes_desafios
      add constraint submissoes_descricao_check
      check (length(btrim(descricao)) between 1 and 500);
  end if;

  if not exists (select 1 from pg_constraint
                  where conname = 'submissoes_link_check'
                    and conrelid = 'public.submissoes_desafios'::regclass) then
    alter table public.submissoes_desafios
      add constraint submissoes_link_check
      check (link_projeto is null or link_projeto ~ '^https?://');
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. RLS
--
-- `desafios` é público por design: o mural aparece na vitrine sem login, e
-- `desafioAtivo()` em src/lib/dados.ts consulta de propósito com o cliente
-- anon para que um erro de policy apareça na hora em vez de ficar escondido
-- atrás da service_role.
--
-- `submissoes_desafios` era `for select to public using (true)`: qualquer
-- portador da anon key lia nome do aluno, link e descrição de todas as
-- submissões. A tabela tinha 0 linhas, então a exposição era teórica — fechar
-- agora saiu de graça. Não entra policy nenhuma no lugar: escrita e leitura
-- passam só pelo service_role, exatamente como votos, e é o que o app já faz
-- (src/lib/dados.ts usa clienteAdmin()).
-- ─────────────────────────────────────────────────────────────────────────
alter table public.desafios            enable row level security;
alter table public.submissoes_desafios enable row level security;

drop policy if exists desafios_leitura    on public.desafios;
drop policy if exists submissoes_leitura  on public.submissoes_desafios;
drop policy if exists submissoes_insere   on public.submissoes_desafios;
drop policy if exists submissoes_apaga    on public.submissoes_desafios;

-- `to anon, authenticated` em vez do `to public` original: `public` inclui
-- roles que não deveriam ler nada, e o que a vitrine precisa é só dos dois.
create policy desafios_leitura on public.desafios for select to anon, authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Privilégios de tabela
--
-- O Supabase dá INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES e TRIGGER
-- para anon e authenticated em toda tabela nova do schema public. RLS filtra
-- DML, mas **não filtra TRUNCATE** — esse grant é uma capacidade que nenhuma
-- policy cobre. Revogar não custa nada: quem escreve nessas três é o servidor,
-- com service_role, que passa por cima da RLS e continua com os privilégios.
--
-- `desafios`, `alunos` e `salas` ficam de fora: a vitrine lê as três com a
-- anon key.
-- ─────────────────────────────────────────────────────────────────────────
revoke all on public.usuarios            from anon, authenticated;
revoke all on public.votos               from anon, authenticated;
revoke all on public.submissoes_desafios from anon, authenticated;
