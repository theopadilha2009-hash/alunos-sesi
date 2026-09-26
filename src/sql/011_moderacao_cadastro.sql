-- 011_moderacao_cadastro.sql — a conta nova nasce pendente de aprovação.
--
-- Até aqui, quem tinha o link criava conta sozinho pela aba "Criar Conta" e
-- aparecia na vitrine pública no mesmo instante. Não havia convite, aprovação
-- nem fila: a vitrine da escola era escrevível por qualquer um que chegasse
-- em `/alunos` ou na raiz.
--
-- O `default true` é a peça que torna esta mudança segura para o que já existe:
-- os alunos de hoje nascem aprovados (ninguém perde acesso, nada some da
-- vitrine), e as criações que JÁ SÃO do ADM — `criarAluno` e `importarLista` —
-- continuam funcionando sem uma linha de mudança, porque o default já é o que
-- elas querem. Só `registrarUsuario`, o auto-cadastro anônimo, escreve `false`
-- na mão.
--
-- Sem índice de propósito: são 13 linhas, e a fila de pendentes é uma query de
-- painel. Atalho: varredura completa em `aprovado`; revisitar se a base passar
-- de alguns milhares de alunos.

ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS aprovado boolean NOT NULL DEFAULT true;
