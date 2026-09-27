-- 015_codigo_ativacao.sql — o aluno que já está na planilha assume o próprio perfil.
--
-- Até aqui, quem era importado pelo ADM ficava órfão. `importarLista` e
-- `criarAluno` gravam só em `alunos`, nunca em `usuarios` — e `registrarUsuario`
-- SEMPRE insere um aluno novo, `aprovado: false`. Então o auto-cadastro da
-- mesma pessoa criava uma segunda linha, pendente, e a primeira continuava sem
-- dono. Em 27/09/2026 isso era 12 dos 15 alunos.
--
-- Estas duas colunas são o lado do banco do código de ativação: o ADM emite, o
-- aluno resgata e define a própria senha. Ficam em `usuarios` e não numa tabela
-- nova porque o código pertence ao ACESSO, não ao aluno — e o resgate é um
-- UPDATE nesta mesma linha, com o código zerado no mesmo movimento.
--
-- Espelha src/lib/ativacao.ts, que é quem gera e hasheia. A coluna guarda o
-- SHA-256, nunca o código: um banco vazado não pode virar 12 contas ativadas.

-- 1. As colunas. Nulas de propósito — a maioria dos usuários nunca teve código,
--    e o resgate as limpa em vez de marcar "usado".
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS codigo_hash text,
  ADD COLUMN IF NOT EXISTS codigo_expira_em timestamptz;

-- 2. UNIQUE e parcial: o resgate busca `WHERE codigo_hash = $1`, e este índice
--    serve à busca e à unicidade de uma vez.
--
--    Sem o UNIQUE, dois alunos com o mesmo código fariam o `maybeSingle()` do
--    resgate estourar — erro de banco chegando na cara do aluno. Com 40 bits
--    sorteados a colisão é rara; quando acontecer, a emissão falha e sorteia de
--    novo, que é melhor do que escolher um dono em silêncio.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_codigo_hash_key
  ON public.usuarios (codigo_hash)
  WHERE codigo_hash IS NOT NULL;

-- 3. Ou o código está inteiro, ou não está. Hash sem validade seria um código
--    que nunca expira; validade sem hash, uma data sobre nada. O resgate não
--    saberia ler nenhum dos dois.
ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_codigo_par;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_codigo_par
  CHECK ((codigo_hash IS NULL) = (codigo_expira_em IS NULL));
