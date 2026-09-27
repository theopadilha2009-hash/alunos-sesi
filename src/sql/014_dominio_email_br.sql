-- 014_dominio_email_br.sql — o domínio da escola termina em .br.
--
-- A 010 exigiu `@estudante.sesisenai.org`, sem o `.br`. O endereço que a escola
-- realmente distribui é `@estudante.sesisenai.org.br` — confirmado em
-- 27/09/2026, quando um aluno tentou usar o próprio e-mail. Com o CHECK antigo,
-- o campo era impossível de preencher: nenhum endereço institucional passava.
-- O único valor no banco era o do seed, justamente com o domínio errado.
--
-- O que o CHECK existe para barrar continua barrado: `...sesisenai.org.br.evil.com`
-- não TERMINA com o sufixo, e `aluno@outro.com@estudante.sesisenai.org.br` tem
-- arroba na parte local. O `\.br` final é literal, não `.` (qualquer caractere) —
-- sem a barra, `estudante.sesisenai.orgXbr` passaria.
--
-- Espelha `DOMINIO_EMAIL_ESCOLA` de src/lib/limites.ts. Se um dia mudar de novo,
-- muda nos dois: o sanitizador normaliza para minúsculo antes de gravar, então
-- qualquer coisa que chegue aqui sem passar por ele é recusada — inclusive uma
-- edição à mão no Studio.

-- 1. Derruba o CHECK ANTES de mexer no dado: o valor novo não passaria nele.
ALTER TABLE public.alunos DROP CONSTRAINT IF EXISTS alunos_email_forma;

-- 2. O e-mail do seed estava com o domínio antigo. `LIKE '%…org'` não casa com
--    `…org.br` (não termina em `org`), então este UPDATE só toca o que é antigo —
--    rodar a migration duas vezes não acrescenta um segundo `.br`.
UPDATE public.alunos
   SET email = replace(email, '@estudante.sesisenai.org', '@estudante.sesisenai.org.br')
 WHERE email LIKE '%@estudante.sesisenai.org';

-- 3. A constraint nova, com o domínio certo.
ALTER TABLE public.alunos
  ADD CONSTRAINT alunos_email_forma
  CHECK (
    email IS NULL
    OR email ~ '^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]?@estudante\.sesisenai\.org\.br$'
  );
