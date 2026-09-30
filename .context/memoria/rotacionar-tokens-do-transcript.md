---
name: rotacionar-tokens-do-transcript
description: Os tokens da Vercel, do Supabase e um PAT do GitHub passaram pelo chat e continuam válidos — pendente de rotação
metadata:
  type: project
---

**Dois vazamentos, e nenhum dos dois foi rotacionado ainda.**

Em **2026-09-17** o Théo colou no chat o token da Vercel (`vcp_…`) e o access token
do Supabase (`sbp_…`) para o primeiro deploy. Ambos foram para o `.env.local`
(gitignored) e para as variáveis de ambiente da Vercel.

Em **2026-09-30** ele colou de novo um token da Vercel (`vcp_…`) e, junto, um
**PAT do GitHub** (`github_pat_…`) — pedindo para aplicar as migrations em
produção. Nenhum dos dois foi usado (as migrations foram aplicadas pelo
`scripts/db-query.sh`, que lê `SUPABASE_DB_URL` do `.env.local`; o GitHub foi
acessado via `gh`, já autenticado). Os valores ficaram no transcript de qualquer
forma.

**Why:** token que passou por transcript é token vazado por definição. Não há como
saber quem leu, e os três dão acesso de escrita: o da Vercel publica em produção,
o do Supabase administra o banco inteiro, o PAT do GitHub escreve no repositório.
"Eu não usei" não reduz o risco — o vazamento é ter passado, não ter sido usado.

**How to apply:** antes de qualquer trabalho novo neste repo, pergunte se a
rotação já foi feita. Se não foi, a ordem é: gerar os tokens novos, atualizar
`.env.local` e as env vars da Vercel, confirmar que o deploy ainda funciona, e só
então **revogar os antigos** — em especial o PAT do GitHub, que não tem uso
registrado nenhum e pode ser revogado imediatamente, sem substituição.
A chave `ADM_CHAVE` **não** precisa de rotação pelo mesmo motivo — ela nunca foi
para o transcript — mas girar ela invalida junto os crachás do ADM e os votos por
cookie (o porquê está em `.context/docs/security.md`).

Ver [[infra-deploy]] para onde cada chave vive.
