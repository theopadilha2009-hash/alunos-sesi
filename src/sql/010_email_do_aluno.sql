-- 010_email_do_aluno.sql — o e-mail institucional, ao lado de LinkedIn/GitHub/Instagram.
--
-- O editor já tinha o CAMPO de e-mail (aba "Conta", `salvarPerfilAction` lia
-- `formData.get("email")`) e nenhuma coluna o sustentava: o valor era gravado só
-- dentro do cookie de sessão, que expira em 30 dias, e nunca chegava ao banco.
-- O aluno digitava, via "Perfil atualizado com sucesso" e perdia o dado depois —
-- a mesma classe de defeito que a 009 fechou para `habilidades`.
--
-- Diferente das outras redes, este não é um link qualquer: é o e-mail da escola,
-- e o que ele prova é vínculo institucional. Por isso o CHECK exige o domínio —
-- `@gmail.com` aqui esvaziaria o campo, que existe justamente para dizer "este
-- perfil é de um estudante matriculado".
--
-- O CHECK garante a FORMA, não a posse: ninguém confirma que o e-mail é do
-- aluno (não há envio de confirmação), então ele é declaração, como a bio. Não
-- há UNIQUE de propósito — sem verificação, duas contas com o mesmo endereço só
-- gerariam erro de constraint não tratado, e nenhuma defesa real.

ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS email text;

-- Espelha `sanitizarEmail` de src/lib/seguranca.ts e `DOMINIO_EMAIL_ESCOLA` de
-- src/lib/limites.ts. Aqui o regex é POSIX e case-sensitive: o sanitizador
-- normaliza para minúsculo antes de gravar, então o banco recusa qualquer coisa
-- que não tenha passado por ele — inclusive uma edição à mão no Studio.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alunos_email_forma'
  ) THEN
    ALTER TABLE public.alunos
      ADD CONSTRAINT alunos_email_forma
      CHECK (
        email IS NULL
        OR email ~ '^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]?@estudante\.sesisenai\.org$'
      );
  END IF;
END $$;
