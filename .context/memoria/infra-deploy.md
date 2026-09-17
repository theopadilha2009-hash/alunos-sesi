---
name: infra-deploy
description: Onde o app está publicado e onde vivem as chaves — Supabase, Vercel e o link do ADM
metadata:
  type: reference
---

Verificado em 2026-09-17, depois do primeiro deploy de produção:

- **Produção**: https://alunos-sesi.vercel.app (projeto `alunos-sesi`, escopo
  pessoal `theopadilha2009-5085`; o `orgId` é `team_NZSAr4PoQtmbTxc2MxkMpKUu`).
- **O projeto está ligado ao GitHub**: todo merge na `main` publica sozinho em
  produção (~30s) e toda branch ganha preview. O alias
  `alunos-sesi-git-main-…` é o deploy automático; `alunos-sesi.vercel.app` pode
  apontar para um deploy manual, já que o CLI também cria alias de produção.
  Descoberto em 2026-09-17 — antes disso eu tinha dito ao Théo que não havia
  integração, e estava errado.
- **Repo**: https://github.com/theopadilha2009-hash/alunos-sesi (público).
- **Supabase**: projeto `adzauecsqoxgnvidrcfm`, org `Templates`, região
  `sa-east-1`. O schema vive em `src/sql/001_schema.sql` — o banco não tem
  migration incremental, então mudança de schema vira arquivo novo em `src/sql/`.
- **O link do ADM** é `<produção>/adm/<ADM_CHAVE>`. O valor da `ADM_CHAVE` está no
  `.env.local` e nas env vars da Vercel; a rota não é linkada e não é indexada.
- **As chaves do app** (Supabase URL, anon, service_role e `ADM_CHAVE`) estão
  cadastradas como *Sensitive* em Production na Vercel. `SUPABASE_DB_URL` e
  `VERCEL_TOKEN` **não** sobem: são só da máquina, usados pelos scripts.

**Why:** o endereço de produção não é adivinhável a partir do código, e o
`alunos-sesi-theopadilha2009-5085s-projects.vercel.app` (o domínio do time) está
atrás de Deployment Protection — abre uma tela de login da Vercel e devolve 200
para qualquer rota, o que engana quem testa por ali achando que é o app.

**How to apply:** para smoke test em produção use sempre
`https://alunos-sesi.vercel.app`, nunca a URL do time. `npm run typecheck` roda
`next typegen` antes do `tsc` de propósito — sem isso o CI quebra num clone limpo,
porque `PageProps` e `RouteContext` só existem depois que o Next gera os tipos de
rota. Ver [[segundo-app-nao-definido]] e [[rotacionar-tokens-do-transcript]].
