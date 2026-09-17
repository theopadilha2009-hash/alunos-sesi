---
name: rotacionar-tokens-do-transcript
description: Os tokens da Vercel e do Supabase passaram pelo chat em 2026-09-17 e ainda não foram rotacionados
metadata:
  type: project
---

Em 2026-09-17 o Théo colou no chat o token da Vercel (`vcp_…`) e o access token
do Supabase (`sbp_…`) para o primeiro deploy. Ambos foram para o `.env.local`
(gitignored) e para as variáveis de ambiente da Vercel, mas **continuam válidos e
já passaram por um transcript** — que é um lugar fora do controle dele.

**Why:** token que passou por transcript é token vazado por definição. Não há
como saber quem leu, e os dois dão acesso de escrita: o da Vercel publica em
produção, o do Supabase administra o banco inteiro.

**How to apply:** antes de qualquer trabalho novo neste repo, pergunte se a
rotação já foi feita. Se não foi, a ordem é: gerar os dois tokens novos, atualizar
`.env.local` e as env vars da Vercel, confirmar que o deploy ainda funciona, e só
então revogar os antigos. A chave `ADM_CHAVE` **não** precisa de rotação pelo
mesmo motivo — ela nunca foi para o transcript — mas girar ela invalida junto os
crachás do ADM e os votos por cookie (o porquê está em `.context/docs/security.md`).
