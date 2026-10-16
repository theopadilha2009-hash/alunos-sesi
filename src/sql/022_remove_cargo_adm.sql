-- 022_remove_cargo_adm.sql — o cargo 'adm' sai do CHECK de `usuarios.role`.
--
-- `role IN ('super_adm', 'adm', 'aluno')` (003:39) nunca teve portador de 'adm'
-- medido: nenhuma tela concede o papel, o gate do painel (`exigirAdm`,
-- `src/app/adm/acoes.ts`) aceita o crachá do link ou `super_adm` — mesmo
-- desenho de `podeAdmin` (`src/lib/sessao.ts`) — e o badge que o desenhava
-- saiu do código no mesmo lote. Um valor que o app não escreve, não lê e
-- ninguém tem é permissão dormente esperando quem a use sem olhar.
--
-- Repetível como a 020: num banco limpo a 003 cria o CHECK com 'adm' e esta
-- migration o troca; em produção o mesmo caminho roda uma vez. O único
-- portador de role em produção é 'super_adm' (o fundador da 003), então a
-- constraint nova não recusa linha existente.
ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_role_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_role_check CHECK (role IN ('super_adm', 'aluno'));
