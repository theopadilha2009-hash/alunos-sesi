---
type: doc
name: development-workflow
description: Day-to-day engineering processes, branching, and contribution guidelines
category: workflow
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Fluxo de desenvolvimento

## Rodar local

```bash
npm install
cp .env.example .env.local   # preencher os valores
npm run dev                  # http://localhost:3000
```

Node 22 (é a versão do CI). O `.env.local` precisa de
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` e `ADM_CHAVE`; `SUPABASE_DB_URL` só é lida pelo
`scripts/db-query.sh`, e `VERCEL_TOKEN` só pelo CLI de deploy. Sem `ADM_CHAVE`
o app sobe, mas o proxy não consegue assinar o cookie do visitante (loga o erro
e segue) e o painel do ADM falha alto.

Rotas para testar de pé: `/` (capa), `/alunos` (vitrine), `/alunos/<slug>`
(perfil), `/adm/<ADM_CHAVE>` (entrada do painel) e `/adm` (painel).

## Ordem de verificação

Sempre nesta ordem, e sempre com o output colado antes de dizer "pronto":

```bash
npm run typecheck   # tsc --noEmit — pega tipo errado e prop que não existe
npm test            # node:test, 27 testes, sem rede
npm run build       # next build — pega erro de RSC, rota e import de servidor no cliente
```

O que cada passo pega e os outros não:

- `typecheck` valida também os tipos de rota gerados pelo Next (`PageProps`,
  `RouteContext`) — é ele que quebra se o `params` for usado sem `await`.
- `test` é a única rede de segurança das funções puras de `src/lib/`
  (ver `testing-strategy.md`).
- `build` é o que pega import de `node:crypto` ou da `service_role` chegando em
  componente `"use client"`, e o que valida que as páginas coletam sem banco.
  Ele **busca as fontes do Google** (`next/font/google` em
  `src/app/layout.tsx`), então precisa de rede.

Depois do build, o que depende de banco se confere à mão (fluxo no browser e
`db-query.sh` contra o projeto real).

## CI

`.github/workflows/ci.yml`, job `verificar`, em `push` para `main` e em todo
`pull_request`:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` com Node 22 e cache de npm
3. `npm ci`
4. `npm run typecheck`
5. `npm test`
6. `npm run build`, com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` e `ADM_CHAVE` preenchidas com valores de mentira

Nenhum passo do CI toca o Supabase. O workflow deixa isso explícito no
comentário do topo: o que precisa de banco é verificado na mão.

## Branch e commit

Convenção do time (não há hook nem commitlint no repositório):

- Branch a partir de `main`, com prefixo de tipo: `feat/<nome>`,
  `fix/<nome>` ou `docs/<nome>`. Nunca commitar direto na `main`.
- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`,
  `fix:`, `docs:`, `refactor:`, `chore:`, com escopo quando ajudar
  (`fix(adm): ...`, `docs(context): ...`).
- Stage com caminhos explícitos (`git add src/lib/busca.ts`), nunca
  `git add -A` — o repo tem `.env.local` e artefatos de build por perto.
- CI verde é o gate para merge.

## Banco e migrations

O schema é versionado em `src/sql/`, numerado (`001_schema.sql`). O
`scripts/db-query.sh` aplica sem `supabase login`/`link`, lendo `SUPABASE_DB_URL`
do `.env.local`. Sequência para qualquer mudança de schema:

```bash
./scripts/db-query.sh --check   -f src/sql/001_schema.sql   # lint offline, não conecta
./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql   # executa em BEGIN/ROLLBACK
./scripts/db-query.sh --psql    --force -f src/sql/001_schema.sql   # aplica de verdade
```

O `--force` é necessário neste arquivo: o lint tem a regra "UPDATE sem WHERE" e
o `before update on public.alunos` do trigger casa com ela. É falso positivo, e
o cabeçalho do próprio `001_schema.sql` documenta isso. Confirmado na prática —
sem `--force` o script aborta com exit 2 antes de conectar.

O `--dry-run` roda o SQL dentro de `BEGIN`/`ROLLBACK`, então não deixa rastro;
é ele que pega erro de sintaxe, FK e constraint que regex não pega. DDL
não-transacional (`CONCURRENTLY`, `ALTER TYPE ... ADD VALUE`, `VACUUM`) não é
coberta por ele — o lint avisa quando o arquivo tem uma dessas.

Regra prática: migration nova é um arquivo novo em `src/sql/`, aplicado com
`--dry-run --force` antes do `--psql --force`. Toda tabela nova nasce com
`enable row level security` e, se for de leitura pública, com policy de select
para `anon`; tabela que não deve ser lida pelo cliente (como `votos`) fica sem
policy nenhuma.

## Deploy

Na Vercel, por CLI. As variáveis de ambiente precisam existir na Vercel **antes**
do primeiro deploy de produção — sem elas o build passa e as páginas quebram em
runtime.

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production   # ...e as demais
vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

O `scripts/vercel-env.sh` faz o mesmo caminho por API, sem o CLI interativo
(`pull`, `list`, `deploy`, `deploy prod`) — ver `tooling.md`.

## Documentação

- `.context/docs/` é a base de conhecimento do repo; este conjunto de arquivos
  é a fonte única entre as ferramentas de IA que trabalham no projeto.
- `AGENTS.md` é gerado pelo `next dev` (bloco `BEGIN:nextjs-agent-rules`) e
  `CLAUDE.md` só faz `@AGENTS.md`. Não remova o bloco gerado: ele volta como
  alteração não commitada na próxima vez que o dev server rodar.
- Fato durável sobre o projeto vai para `.context/docs/`; decisão pontual vai no
  commit.
