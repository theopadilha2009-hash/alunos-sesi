-- 019_limpeza_de_salas.sql — tira do ar duas linhas de `salas` que não são turma.
--
-- As duas foram criadas em 30/09/2026, pelo `window.prompt` do "+ Nova turma" do
-- painel do ADM (`PainelAdmIntegrado`), que só recusa texto com menos de 2
-- caracteres — não valida mais nada. Medido antes de apagar:
--
--   nome             | id                                   | criado_em (UTC)
--   -----------------+--------------------------------------+--------------------
--   vai tomaar no cu | ac4f07c8-0cde-432f-a07d-181b01ae7ea2 | 2026-09-30 11:36:30
--   dsm3             | 4f9e33a0-6126-431e-9e7a-aaa4884d3507 | 2026-09-30 12:32:18
--
-- As duas tinham **zero alunos** — conferido com `count` por sala antes de apagar,
-- e é o que torna esta migration segura: não há `alunos.sala_id` para realocar.
--
-- Por que cada uma sai:
--
--   `vai tomaar no cu` não é turma nenhuma e **aparecia no ranking público da
--   vitrine** — o ranking lê `retrato_salas`, e a view não filtra por nome. Nada
--   a realocar, nada a preservar.
--
--   `dsm3` é duplicata de `DSM3` (4 alunos), e a `unique` de `salas.nome` é
--   sensível a caixa, então as duas conviviam. Era ela que fazia o cadastro de
--   `DSM3-25` casar em `dsm3`: a busca tolerante por substring casa "dsm3" dentro
--   de "dsm3-25". A turma certa sempre foi a maiúscula, que é a que tem gente.
--
-- O `not exists` é cinto e suspensório, não desconfiança do `count`: se alguém
-- mover alunos para uma dessas linhas entre a medição e o deploy (ou se alguém
-- recriar `dsm3` de propósito mais tarde), a migration **não apaga** — a linha
-- fica, com os alunos dela, e o problema aparece em vez de virar dado perdido.
--
-- Num banco limpo as duas linhas não existem (nascem só em produção, na mão) e
-- os dois `DELETE` não pegam nada. A migration é o registro do que foi feito.

delete from public.salas s
 where s.nome in ('dsm3', 'vai tomaar no cu')
   and not exists (
     select 1 from public.alunos a where a.sala_id = s.id
   );
