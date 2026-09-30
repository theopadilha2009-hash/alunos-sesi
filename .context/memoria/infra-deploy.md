---
name: infra-deploy
description: Onde o app está publicado e onde vivem as chaves — Supabase, Vercel e o link do ADM
metadata:
  type: reference
---

Verificado em 2026-09-17, depois do primeiro deploy de produção:

- **Produção**: https://alunos-sesi.vercel.app (projeto `alunos-sesi`, escopo
  pessoal `theopadilha2009-5085`; o `orgId` é `team_NZSAr4PoQtmbTxc2MxkMpKUu`).
- **A função roda em `gru1`** (São Paulo), fixado em `vercel.json`. Verificado
  em 2026-09-25: sem esse arquivo o projeto fica no `iad1` e cada query
  atravessa o Atlântico até o Supabase em `sa-east-1`. Corrigir levou o TTFB de
  `/alunos` de 0,536s para 0,167s (−69%, n=3×30). O `x-vercel-id` diz onde a
  função está: `gru1::iad1` é longe do banco, `gru1::gru1` é perto.
- **O projeto está ligado ao GitHub**: todo merge na `main` publica sozinho em
  produção (~30s) e toda branch ganha preview. O alias
  `alunos-sesi-git-main-…` é o deploy automático; `alunos-sesi.vercel.app` pode
  apontar para um deploy manual, já que o CLI também cria alias de produção.
  Descoberto em 2026-09-17 — antes disso eu tinha dito ao Théo que não havia
  integração, e estava errado.
- **Repo**: https://github.com/theopadilha2009-hash/alunos-sesi (público).
- **Supabase**: projeto `adzauecsqoxgnvidrcfm`, org `Templates`, região
  `sa-east-1`. O schema é a sequência numerada de `src/sql/001…N`, e **cada
  mudança de schema é um arquivo novo** nessa pasta — nunca editar um já aplicado,
  porque o CI reproduz o banco do zero por ela (`scripts/checar-migrations.sh`) e
  o resultado tem que ser o mesmo nos dois caminhos. Aplicar em produção é
  `scripts/db-query.sh`: `--check` (lint offline), `--dry-run` (roda dentro de uma
  transação e faz ROLLBACK), `--psql` (aplica de verdade). O script lê
  `SUPABASE_DB_URL` do `.env.local` e passa a senha por variável de ambiente,
  nunca por argv. Aplicado em 30/09/2026: **017, 018 e 019 estão em produção**.
  A ordem é migration **antes** do deploy — o código novo pode depender da coluna
  nova e a vitrine inteira cai (ver [[pendencias-de-decisao]]).
- **O link do ADM** é `<produção>/adm/<ADM_CHAVE>`. O valor da `ADM_CHAVE` está no
  `.env.local` e nas env vars da Vercel; a rota não é linkada e não é indexada.
- **As chaves do app** (Supabase URL, anon, service_role e `ADM_CHAVE`) estão
  cadastradas como *Sensitive* em Production na Vercel. `SUPABASE_DB_URL` e
  `VERCEL_TOKEN` **não** sobem: são só da máquina, usados pelos scripts.
- **O store de mídia** é `alunos-sesi-midia` (`store_6IwQQvygqSqI5bLH`), região
  `gru1`, acesso **público**, criado em 2026-09-27. O host de um arquivo é
  `<storeId>.public.blob.vercel-storage.com` — o id do store é o subdomínio, e a
  CSP casa host exato (ver `midia.md`). A env **`BLOB_READ_WRITE_TOKEN`** está em
  Production, Preview e Development; **o OIDC do projeto não a substitui**:
  `handleUpload` exige o token, e sem ele a rota `/api/upload` não assina nada.
  No CI o valor é um literal de mentira (`vercel_blob_rw_de-mentira`), só para o
  build não quebrar na validação do módulo. O projeto está no plano **Hobby**:
  dentro dos limites o Blob é grátis e **não cobra excedente** — ao estourar, ele
  para de funcionar até o próximo ciclo. Cadastrar env nova continua sendo passo
  manual no dashboard, pelo mesmo motivo do `SESSAO_SEGREDO`.

  Verificado em 2026-09-24: o app passou a exigir **`SESSAO_SEGREDO`** (mestre do
  HMAC das sessões, com HKDF por propósito; a `ADM_CHAVE` só abre `/adm/<chave>`).
  Sem ela a vitrine sobe, mas `segredo()` lança e **login e link do ADM quebram**.
  O `scripts/vercel-env.sh` do repo só faz `pull`/`list`/`deploy` — não tem `add`,
  e `vercel login` está no deny do kit, então cadastrar env nova é passo manual no
  dashboard. Rotacionar o valor mata todos os `sesi.*`: os visitantes ganham id
  novo e podem estrelar de novo os mesmos alunos.

**Why:** o endereço de produção não é adivinhável a partir do código, e o
`alunos-sesi-theopadilha2009-5085s-projects.vercel.app` (o domínio do time) está
atrás de Deployment Protection — abre uma tela de login da Vercel e devolve 200
para qualquer rota, o que engana quem testa por ali achando que é o app.

**How to apply:** para smoke test em produção use sempre
`https://alunos-sesi.vercel.app`, nunca a URL do time. `npm run typecheck` roda
`next typegen` antes do `tsc` de propósito — sem isso o CI quebra num clone limpo,
porque `PageProps` e `RouteContext` só existem depois que o Next gera os tipos de
rota. Ver [[segundo-app-nao-definido]] e [[rotacionar-tokens-do-transcript]].
