-- 018_turmas_oficiais.sql — as 9 turmas que o cadastro OFERECE passam a existir.
--
-- O `LoginTela` monta o `<select required>` do cadastro direto de `TURMAS_OFICIAIS`
-- (`src/lib/turmas.ts`), e até aqui o banco tinha DUAS delas. Medido em produção em
-- 30/09/2026, `select nome from public.salas` devolvia:
--
--   1ºA · Eletrotécnica      3ºA · Desenvolvimento   DS4-25        vai tomaar no cu
--   2ºA · Automação IoT      3ºB · Robótica FLL      dsm3
--                                                    DSM3
--
-- Ou seja: das 9 opções oferecidas, existiam `DSM3` e `DS4-25`. As outras 7 não.
--
-- O que acontecia com quem escolhia uma delas. `registrarUsuario` procura a sala em
-- duas passadas: igualdade por `fold` e, falhando, uma busca tolerante por substring
-- (`auth.ts`). O resultado, medida a medida:
--
--   DSM3-25  → a busca tolerante acha "dsm3" DENTRO de "dsm3-25" e matricula o aluno
--              na linha duplicada minúscula — em silêncio, sem avisar ninguém;
--   as outras 6 → nenhuma casa, e o cadastro para com "Sala não encontrada".
--
-- Antes desta migration o estrago estava escondido: havia um fallback que jogava
-- qualquer turma não reconhecida em "DSM3" ou na primeira sala da lista. O aluno era
-- matriculado na turma errada e só descobria no crachá. Esse fallback saiu em 30/09
-- (é o gate de 011, ver `.context/memoria/pendencias-de-decisao.md`) — e foi ele sair
-- para o problema dos dados aparecer. O erro na tela é o comportamento certo; o que
-- falta é a turma existir.
--
-- Por que INSERT e não mexer na lista: `TURMAS_OFICIAIS` é a lista OFICIAL da escola e
-- é ela que o formulário mostra. O banco é que estava atrás dela. Encolher a lista
-- para as duas que existiam esconderia 7 turmas reais.
--
-- `on conflict (nome) do nothing` porque a tabela é `unique` em `nome` e esta
-- migration precisa ser repetível: em produção ela insere 7 (as duas que já existem
-- são puladas), e num banco limpo insere as 9 — o `DSM3` já vem do `003_crm_auth.sql`,
-- e é ele que é pulado lá. O `003` continua sendo quem descreve a turma principal.
--
-- `ordem` segue o índice de `TURMAS_OFICIAIS` para o ranking da vitrine não mudar de
-- ordem a cada leitura. `curso` e `turno` ficam NULL de propósito: são colunas
-- anuláveis e o app as tolera, e chutar "Manhã"/"Tarde" para 7 turmas que ninguém
-- descreveu seria inventar dado da escola. Quem souber preenche pelo painel.

insert into public.salas (nome, ordem) values
  ('DSM3',    0),
  ('DSM3-25', 1),
  ('DS1-25',  2),
  ('DS2-25',  3),
  ('DS4-25',  4),
  ('DS1-26',  5),
  ('DS2-26',  6),
  ('DS1-24',  7),
  ('DS2-24',  8)
on conflict (nome) do nothing;
