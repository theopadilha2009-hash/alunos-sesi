-- 009_habilidades_do_aluno.sql — as competências que o próprio aluno declara.
--
-- O tipo `AlunoNaTela.habilidades` existia em src/lib/tipos.ts e nenhuma coluna
-- o sustentava: o que a tela mostrava vinha de `extrairHabilidades(bio)`, um
-- regex de até 4 tags sobre a bio. E os chips do editor mexiam num estado local
-- que não entrava no payload do formulário — adicionar ou remover competência
-- nunca chegou ao banco. Eram três fontes para a mesma coisa (o regex da bio, o
-- estado que não salvava, e o contador de endossos de 006_endossos.sql).
--
-- Nullable e SEM default '[]' de propósito: `null` quer dizer "nunca editou" e
-- continua caindo no regex da bio; `[]` quer dizer "escolheu não ter nenhuma".
-- Um default apagaria a diferença, e a primeira edição de um aluno antigo
-- zeraria competências que a bio dele sempre declarou.

ALTER TABLE public.alunos ADD COLUMN IF NOT EXISTS habilidades jsonb;

-- A forma do array é do banco, o vocabulário é do app. Aqui só se garante que é
-- array e que cabe no teto — a lista fechada de 10 nomes mora em
-- src/lib/habilidades.ts (`LISTA_HABILIDADES`), e repetir os nomes aqui criaria
-- duas verdades que divergem na primeira competência nova.
--
-- O 6 é o mesmo `MAX_HABILIDADES` de src/lib/limites.ts, igual ao 12 de
-- `alunos_stickers_forma` em 005_integridade.sql espelhando LIMITES_STICKERS.max.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alunos_habilidades_forma'
  ) THEN
    ALTER TABLE public.alunos
      ADD CONSTRAINT alunos_habilidades_forma
      CHECK (
        habilidades IS NULL
        OR (jsonb_typeof(habilidades) = 'array' AND jsonb_array_length(habilidades) <= 6)
      );
  END IF;
END $$;
