-- 012_aparencia_do_aluno.sql — capa e cor de destaque escolhidas pelo aluno.
--
-- Até aqui a cor que pinta o perfil não era do aluno: era `corDaSala(nome)`, um
-- hash do nome da TURMA sobre as seis cores do SESI (`src/lib/cores.ts`). Dois
-- alunos de salas diferentes tinham cores diferentes, mas nenhum dos dois
-- escolheu a sua — e quem era da mesma sala era obrigado a ser igual.
--
-- As duas colunas nascem NULL, e isso é o desenho, não uma pendência:
--
--   cor_perfil NULL = "usa a cor da minha sala", que é exatamente o que o
--              perfil mostra hoje. Os 13 alunos existentes acordam idênticos,
--              sem backfill e sem deploy casado.
--   banner_url NULL = "sem capa", e o perfil desenha um gradiente da cor de
--              destaque no lugar. Ninguém fica com faixa quebrada.
--
-- O CHECK de `cor_perfil` repete a lista de `CORES_SALA` de propósito: é allowlist, e
-- allowlist que mora só no app deixa de ser allowlist no dia em que alguém
-- escreve no banco por fora. Espelha o padrão de `alunos_email_forma` (010) e
-- das CHECKs de link em `001_schema.sql`. Se a paleta mudar lá, muda aqui.
--
-- Sem CHECK em `banner_url`: o teto é de bytes (220 KB de data URL), e o
-- Postgres não tem como expressá-lo num CHECK sem virar função. Quem barra é
-- `urlImagemSegura` no servidor, com o mesmo `MAX_DATA_URL_CAPA` que o
-- formulário usa para avisar antes do upload.

ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS cor_perfil text;

ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS banner_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alunos_cor_perfil_paleta'
  ) THEN
    ALTER TABLE public.alunos
      ADD CONSTRAINT alunos_cor_perfil_paleta
      CHECK (
        cor_perfil IS NULL
        OR cor_perfil IN ('#3FC2BC', '#38B95D', '#F3B544', '#D74D42', '#4881AE', '#2D929E')
      );
  END IF;
END $$;
