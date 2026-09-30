-- 017_retrato_salas_aprovado.sql — o ranking público de salas para de contar quem
-- ainda não passou pela moderação.
--
-- `retrato_salas` (001:143) nasceu com `left join public.alunos a on a.sala_id = s.id`,
-- sem filtro nenhum. Na época não havia gate: todo aluno era público, e contar todos
-- era contar todos os que existiam. Com `alunos.aprovado` (011), as duas fontes da
-- vitrine passaram a discordar — os cards e as métricas vêm de `listarAlunos`, que
-- filtra; o ranking de salas vem desta view, que não filtrava.
--
-- O sintoma é aritmético e aparece na tela: um aluno se autocadastra pendente na DSM3,
-- o ranking mostra "DSM3 — N alunos" e a lista logo abaixo mostra N-1. No caso extremo,
-- uma sala cujo único membro é um pendente aparece no ranking com "1 alunos" e nenhum
-- perfil visível ao clicar. A policy `alunos_leitura` é `using (true)` (001:137), então
-- a view entrega a linha do pendente a quem consulta — o filtro só pode estar aqui.
--
-- `and a.aprovado` vai na CONDIÇÃO DO JOIN, não no `where`: no `where`, a linha da sala
-- sem nenhum aprovado sumiria do ranking inteiro, e "a turma existe mas ninguém passou
-- pela moderação" (0 alunos) é uma informação legítima — diferente de "a turma não existe".
--
-- Por que arquivo novo em vez de corrigir o 001: a sequência 001..N é a fonte do banco
-- e o CI a reproduz do zero (scripts/checar-migrations.sh), então o 017 entra por último
-- e o resultado final já é o correto nos dois caminhos — no banco que nasce limpo e no
-- que já está em produção. O 001 fica como registro do que foi criado, igual ao 016 não
-- reescrevendo o 004.
--
-- `security_invoker = true` PRECISA vir junto: `create or replace view` sem a opção a
-- devolve ao default (desligada), e a view passaria a rodar com os privilégios do dono,
-- furando a RLS de quem consulta. A opção não é herdada da definição anterior.

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
left join public.alunos a on a.sala_id = s.id and a.aprovado
group by s.id, s.nome, s.curso, s.turno, s.ordem;

comment on view public.retrato_salas is
  'Agregado por sala para o ranking público. Conta apenas alunos aprovados: a view é lida por anon e não há RLS que esconda o pendente, então o filtro mora no join (017).';
