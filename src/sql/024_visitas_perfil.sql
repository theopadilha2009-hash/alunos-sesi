-- 024_visitas_perfil.sql — o contador de visitas do perfil (A5).
--
-- O aluno que não sabe que alguém está olhando não cuida do perfil. Esta
-- tabela é a contagem: UMA linha por (aluno, visitante, DIA), escrita pelo
-- servidor quando o perfil é aberto no navegador (rota /api/visita, chamada
-- do cliente de propósito — o prefetch de <Link> na vitrine carrega HTML,
-- não executa efeito, e não conta visita fantasma).
--
-- Por que dia no PK: o visitante que volta amanhã é outra visita; o que
-- recarrega hoje não é. Sem isto, cada carregamento inflaria o número e a
-- métrica virava ruído.
--
-- O `visitante_id` é o MESMO cookie anônimo assinado das estrelas
-- (`^[a-f0-9]{32}$`, 001:70) — contagem sem identidade, nunca dado pessoal.
--
-- RLS: leitura e inserção liberadas ao anon, pelo mesmo desenho de
-- `alunos_leitura` (001:137) — quem carrega a vitrine é anon. Sem UPDATE e
-- sem DELETE: o histórico é apêndice.
create table if not exists public.visitas_perfil (
  aluno_id uuid not null references public.alunos (id) on delete cascade,
  visitante_id text not null check (visitante_id ~ '^[a-f0-9]{32}$'),
  dia date not null default current_date,
  primary key (aluno_id, visitante_id, dia)
);

alter table public.visitas_perfil enable row level security;

create policy visitas_leitura on public.visitas_perfil
  for select to anon using (true);

create policy visitas_insercao on public.visitas_perfil
  for insert to anon with check (true);
