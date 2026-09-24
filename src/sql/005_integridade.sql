-- 005_integridade.sql — Integridade das submissões e dos JSONB de perfil
-- Fecha buracos que o código do app já assume fechados: contador de submissões,
-- uma submissão por aluno por desafio, e a forma dos arrays de projetos/mídias/stickers.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. submissoes_count mantido por trigger
--
-- A coluna existe desde que a tabela nasceu, mas NUNCA teve quem a
-- atualizasse: não havia função nem trigger (conferido em pg_proc e
-- pg_trigger). O app já não incrementa na mão, de propósito, para não dobrar
-- quando a trigger existisse — então hoje o contador fica travado em 0.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.sync_submissoes_count() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.desafios set submissoes_count = submissoes_count + 1 where id = new.desafio_id;
  elsif tg_op = 'DELETE' then
    update public.desafios
       set submissoes_count = greatest(submissoes_count - 1, 0)
     where id = old.desafio_id;
  end if;
  return null;
end;
$$;

drop trigger if exists submissoes_sync on public.submissoes_desafios;
create trigger submissoes_sync
  after insert or delete on public.submissoes_desafios
  for each row execute function public.sync_submissoes_count();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Uma submissão por aluno por desafio
--
-- O código em src/app/acoes-crm.ts trata o erro 23505 e procura a string
-- 'submissoes_unica_por_aluno' na mensagem, mas a constraint nunca existiu —
-- aquele ramo era código morto e a duplicata entrava. O nome aqui precisa ser
-- exatamente esse, senão a mensagem amigável nunca aparece.
--
-- Pré-checagem rodada antes de escrever este arquivo, contra o banco vivo:
--   select desafio_id, aluno_id, count(*) from public.submissoes_desafios
--   group by 1,2 having count(*) > 1;   -> 0 linhas
-- A tabela tinha 0 linhas na hora, então a checagem tem que rodar de novo se
-- este arquivo for aplicado muito depois.
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'submissoes_unica_por_aluno'
       and conrelid = 'public.submissoes_desafios'::regclass
  ) then
    alter table public.submissoes_desafios
      add constraint submissoes_unica_por_aluno unique (desafio_id, aluno_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Forma e tamanho dos JSONB de perfil
--
-- O app sanitiza na entrada, mas sanitização de aplicação só vale para quem
-- passa por ela: um insert direto pelo PostgREST grava o que quiser. Estes
-- limites são os mesmos de src/lib/seguranca.ts (LIMITES_STICKERS.max,
-- maxProjetos e maxMidias) — se um lado mudar, o outro tem que mudar junto.
--
-- Pré-checagem, contra o banco vivo:
--   select count(*) from public.alunos
--    where jsonb_array_length(projetos) > 10
--       or jsonb_array_length(midias) > 12
--       or jsonb_array_length(stickers) > 12;   -> 0
-- ─────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'alunos_projetos_forma' and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_projetos_forma
      check (jsonb_typeof(projetos) = 'array' and jsonb_array_length(projetos) <= 10);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'alunos_midias_forma' and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_midias_forma
      check (jsonb_typeof(midias) = 'array' and jsonb_array_length(midias) <= 12);
  end if;

  -- stickers é nullable: a constraint tem que deixar NULL passar, senão os
  -- alunos que nunca abriram o Estúdio ficam inválidos.
  if not exists (
    select 1 from pg_constraint
     where conname = 'alunos_stickers_forma' and conrelid = 'public.alunos'::regclass
  ) then
    alter table public.alunos
      add constraint alunos_stickers_forma
      check (
        stickers is null
        or (jsonb_typeof(stickers) = 'array' and jsonb_array_length(stickers) <= 12)
      );
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. EXECUTE das funções security definer
--
-- No Postgres, toda função nova ganha EXECUTE para PUBLIC por padrão. Isso vale
-- para as triggers daqui também, e o PostgREST expõe função do schema public
-- como endpoint RPC — ou seja, cada security definer nova vira uma rota HTTP
-- que roda com privilégio de owner. Trigger nenhuma precisa desse grant: o
-- disparo não checa privilégio de EXECUTE.
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function public.sync_estrelas() from public, anon, authenticated;
revoke execute on function public.sync_submissoes_count() from public, anon, authenticated;
revoke execute on function public.touch_atualizado() from public, anon, authenticated;
