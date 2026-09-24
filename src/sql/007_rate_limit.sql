-- 007_rate_limit.sql — Rate limit que sobrevive ao cold start
-- Hoje o limitador é um Map em memória (src/lib/seguranca.ts). Em serverless
-- cada instância nova nasce com o mapa vazio, então o limite reinicia sozinho —
-- na prática ele quase não existe. Esta tabela resolve isso sem trazer Redis/KV.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. A tabela: uma linha por chave
--
-- `contagem` e `primeira_em` formam a janela deslizante; `bloqueado_ate` é o
-- castigo depois de estourar. A chave é o texto que o app manda, com prefixo
-- de domínio (ex.: 'login:theo1234', 'login-ip:189.5.1.2', 'senha:<uuid>').
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.tentativas (
  chave        text primary key,
  contagem     integer not null default 0,
  primeira_em  timestamptz not null default now(),
  bloqueado_ate timestamptz,
  constraint tentativas_contagem_check check (contagem >= 0)
);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. checar_rate_limit — devolve true quando PERMITIDO
--
-- Atômica por construção: `insert ... on conflict do update` é uma instrução
-- só, e o Postgres trava a linha em conflito até a transação fechar. Duas
-- requisições simultâneas na mesma chave serializam, e o segundo incremento lê
-- o valor já gravado. O Map em memória perdia exatamente isso — era
-- read-modify-write na aplicação, sem lock.
--
-- O `t.` nos CASE é o alias da linha JÁ existente, não da nova. Em cada
-- expressão o CASE repete as três situações na mesma ordem: já bloqueado,
-- janela vencida, dentro da janela. `t.bloqueado_ate > now()` dá NULL quando a
-- coluna é NULL, e NULL não entra no WHEN — que é o que se quer, porque "não
-- tem bloqueio" precisa cair no próximo ramo.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.checar_rate_limit(
  p_chave text,
  p_max integer,
  p_janela_ms integer,
  p_bloqueio_ms integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_linha public.tentativas;
  v_janela interval := p_janela_ms * interval '1 millisecond';
begin
  insert into public.tentativas as t (chave, contagem, primeira_em, bloqueado_ate)
  values (p_chave, 1, now(), null)
  on conflict (chave) do update set
    contagem = case
      when t.bloqueado_ate > now() then t.contagem
      when now() - t.primeira_em > v_janela then 1
      else t.contagem + 1
    end,
    primeira_em = case
      when t.bloqueado_ate > now() then t.primeira_em
      when now() - t.primeira_em > v_janela then now()
      else t.primeira_em
    end,
    bloqueado_ate = case
      when t.bloqueado_ate > now() then t.bloqueado_ate
      when now() - t.primeira_em > v_janela then null
      when t.contagem + 1 > p_max then now() + p_bloqueio_ms * interval '1 millisecond'
      else null
    end
  returning * into v_linha;

  -- Limpeza oportunista: sem isto a tabela cresce para sempre, uma linha por
  -- IP e por usuário que já tentou entrar. 1% das chamadas é suficiente e não
  -- custa requisição extra — não há cron nem job neste projeto.
  if random() < 0.01 then
    delete from public.tentativas
     where (bloqueado_ate is not null and bloqueado_ate < now() - interval '1 day')
        or (bloqueado_ate is null and primeira_em < now() - interval '1 day');
  end if;

  return v_linha.bloqueado_ate is null or v_linha.bloqueado_ate <= now();
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Privilégios
--
-- RLS ligada e nenhuma policy: ninguém além do service_role lê ou escreve.
-- Nem a contagem de tentativas por usuário precisa ser pública.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.tentativas enable row level security;

drop policy if exists tentativas_leitura on public.tentativas;
drop policy if exists tentativas_insere  on public.tentativas;
drop policy if exists tentativas_apaga   on public.tentativas;

revoke all on public.tentativas from anon, authenticated;

-- No Postgres, EXECUTE de função nova vai para PUBLIC por padrão, e o
-- PostgREST expõe função do schema public como endpoint RPC: sem este revoke,
-- /rest/v1/rpc/checar_rate_limit ficaria aberto para qualquer anon key e
-- daria para encher a tabela ou bloquear outra pessoa de propósito.
revoke execute on function public.checar_rate_limit(text, integer, integer, integer)
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Verificação depois de aplicar:
--
--   select public.checar_rate_limit('teste:manual', 3, 60000, 60000);  -- t
--   select public.checar_rate_limit('teste:manual', 3, 60000, 60000);  -- t
--   select public.checar_rate_limit('teste:manual', 3, 60000, 60000);  -- t
--   select public.checar_rate_limit('teste:manual', 3, 60000, 60000);  -- f
--   delete from public.tentativas where chave = 'teste:manual';
-- ─────────────────────────────────────────────────────────────────────────
