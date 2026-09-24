-- 008_senhas_lockdown.sql — Tranca todo hash fora do formato argon2
-- Rede de segurança: transforma em não-autenticável qualquer senha que não
-- esteja em argon2id. Não substitui a troca de senha — só garante que um hash
-- reaparecido (reaplicação da migration antiga, insert manual) não vire porta.

-- ─────────────────────────────────────────────────────────────────────────
-- O app aceita três estados em usuarios.senha_hash (src/lib/senha.ts):
--   $argon2id$…            -> login normal
--   ^[0-9a-f]{64}$         -> SHA-256 legado: login funciona e o hash é
--                             regravado em argon2 na mesma requisição
--   qualquer outra coisa   -> login negado
--
-- O SHA-256 legado precisa continuar funcionando para quem ainda não logou
-- depois desta rodada (o rehash acontece no primeiro login). Depois que todo
-- mundo tiver logado pelo menos uma vez, dá para apertar este filtro para
-- '^\$argon2' e aí sim o legado morre de vez.
--
-- Hoje o filtro só pega o que não é nenhum dos dois — o estado honesto de
-- "senha que ninguém deveria conseguir usar".
-- ─────────────────────────────────────────────────────────────────────────
update public.usuarios
   set senha_hash = '!bloqueado'
 where senha_hash !~ '^\$argon2'
   and senha_hash !~ '^[0-9a-f]{64}$';

-- ─────────────────────────────────────────────────────────────────────────
-- Verificação depois de aplicar (rode e confira que devolve uma linha por
-- usuário, com prefixo `$argon2id$` ou `!bloqueado`):
--
--   select username, role, left(senha_hash, 10) as prefixo, length(senha_hash) as tam
--     from public.usuarios order by username;
-- ─────────────────────────────────────────────────────────────────────────
