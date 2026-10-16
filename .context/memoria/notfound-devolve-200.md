---
name: notfound-devolve-200
description: "notFound() em página dinâmica devolve HTTP 200 com o corpo do not-found — sistêmico no Next 16.3.5, pré-existente, e não é o loading.tsx"
metadata:
  node_type: memory
  type: project
  originSessionId: bb0e7c1a-2b9f-412a-942d-f8deab83faeb
  modified: 2026-10-16T20:40:06.667Z
---

**`notFound()` em página dinâmica devolve HTTP 200.** Medido em 16/10/2026, local
(`next build` + `next start`, Next 16.3.5) e em produção:

- `/turmas/turma-que-nao-existe` → **200**, corpo = `not-found.tsx` custom correto
- `/alunos/slug-falso` → **200** (mesma coisa — **pré-existente** em todas as
  rotas que chamam `notFound()`: `/alunos/[slug]`, `/u/[slug]`, `/validar/[slug]`)
- rota sem match nenhum (`/rota-aleatoria`) → **404 de verdade**

**O que já foi descartado:** (1) o `loading.tsx` da raiz do `app/` — removido do
caminho e rebuildado: igual; (2) o `proxy.ts` — usa `NextResponse.next()` e não
toca em status. Hipótese restante: o shell do documento é streamado antes do
`notFound()` resolver, e o status já partiu como 200 — não investigado até o fim.

**Why:** um crawler trata perfil inexistente como página existente (200). O
impacto real hoje é baixo: os perfis são `noindex`, o sitemap não os anuncia e o
corpo renderizado é o 404 visual certo. Mas qualquer dia alguém olha o Search
Console e vê "soft 404".

**How to apply:** não "conserte" isso devolvendo status manual (`NextResponse`
com 404) — o desenho da casa é o `notFound()` + `not-found.tsx`. Se o SEO do 404
um dia importar, investigar o streaming do shell no Next 16 (o caminho sem match
prova que o not-found.tsx sabe devolver 404 quando o roteamento resolve antes de
renderizar). Ver [[pendencias-de-decisao]] para o formato de item de fila.
