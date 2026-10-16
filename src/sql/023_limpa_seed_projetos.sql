-- 023_limpa_seed_projetos.sql — o perfil do fundador deixa de exibir os dados
-- de exemplo que a 003 semeou.
--
-- A 003 criou o aluno do theo-padilha com 2 projetos e 2 mídias de exemplo
-- (Imagens Unsplash, ids 'proj-1'/'proj-2' dentro do JSONB de `alunos`).
-- Medido em 16/10/2026 (`db-query.sh --psql`): o JSONB dele contém exatamente
-- o seed, nada editado por cima — e o link dos exemplos é um perfil externo,
-- não o que o aluno escolheu.
--
-- A condição casa o PRIMEIRO item de cada array pelo conteúdo do seed: se o
-- jsonb já tiver sido reescrito com conteúdo real (que não começa por
-- 'proj-1'), este UPDATE não pega e nada real é apagado.
--
-- Idempotente: com `projetos` vazio, `projetos->0` é NULL e a condição não
-- casa — rodar de novo é um UPDATE de zero linhas.
UPDATE public.alunos
SET projetos = '[]'::jsonb,
    midias = '[]'::jsonb
WHERE projetos->0->>'id' = 'proj-1'
  AND midias->0->>'legenda' = 'Workspace de Desenvolvimento DSM3';
