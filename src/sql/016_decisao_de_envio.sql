-- 016_decisao_de_envio.sql — "rejeitado" e "ninguém olhou ainda" param de ser o mesmo valor.
--
-- `submissoes_desafios.aprovado` nasceu `boolean default false` (004), e o default
-- é o problema: um envio NOVO também nasce `false`. O botão "Rejeitar" da fila do
-- ADM grava `false` — o valor que a linha já tinha. Clicar nele não mudava nada, e
-- o ADM não tinha como dizer "este projeto não passou".
--
-- Aqui `aprovado` vira tri-estado sem coluna nova:
--   null  → pendente (ninguém decidiu)
--   true  → aprovado
--   false → rejeitado
--
-- O `DROP DEFAULT` é a peça que faz isso funcionar: sem ele a coluna continuaria
-- nascendo `false` e a confusão voltaria na primeira submissão. Quem grava `null`
-- a partir de agora é o insert de `submeterDesafio`, em src/lib/dados.ts.
--
-- A coluna já era nullable em DDL (004:48 não tem `NOT NULL`) — a mudança é de
-- contrato, não de tipo, então não há `ALTER TYPE` nem reescrita de tabela.

ALTER TABLE public.submissoes_desafios
  ALTER COLUMN aprovado DROP DEFAULT;

-- Backfill: todo `false` de hoje é o default, não uma decisão.
--
-- Em 28/09/2026 havia um único envio em produção (Arthur Oliveira, pendente) e
-- nenhum aprovado — a fila do ADM só passou a existir agora, então ninguém teve
-- como rejeitar nada antes desta migration. Depois dela, todo `false` é decisão
-- de alguém, e o backfill não pode ser repetido sem apagar rejeições de verdade.
UPDATE public.submissoes_desafios
   SET aprovado = NULL
 WHERE aprovado = FALSE;

COMMENT ON COLUMN public.submissoes_desafios.aprovado IS
  'Decisão do ADM: null = pendente, true = aprovado, false = rejeitado. Sem default: envio novo nasce null.';
