---
type: doc
name: tooling
description: Scripts, IDE settings, automation, and developer productivity tips
category: tooling
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Ferramentas

## Scripts do `package.json`

| Script | Comando | Para quê |
|---|---|---|
| `npm run dev` | `next dev` | servidor de desenvolvimento em http://localhost:3000; gera os tipos de rota e reescreve o `AGENTS.md` |
| `npm run build` | `next build` | build de produção; é o passo que pega import de servidor vazando para o cliente |
| `npm start` | `next start` | serve o build (precisa de `npm run build` antes) |
| `npm run typecheck` | `tsc --noEmit` | checagem de tipos isolada, sem emitir arquivo |
| `npm test` | `node --experimental-strip-types --test tests/*.test.mjs` | 27 testes de funções puras, sem rede |

Não há script de lint de JS/TS: não há ESLint nem Prettier no repositório. O
gate de estilo é o `typecheck` mais a revisão. O lint que existe é o de SQL,
dentro do `scripts/db-query.sh`.

## `scripts/db-query.sh`

Roda SQL no Supabase do projeto sem `supabase login` nem `supabase link`. Lê
`SUPABASE_DB_URL` do `.env.local` da raiz (só nos modos que conectam).

| Modo | Comando | Conecta? |
|---|---|---|
| normal | `./scripts/db-query.sh "SELECT ..." --output table` | sim (`supabase db query`) |
| `--check` | `./scripts/db-query.sh --check -f src/sql/x.sql` | **não** — lint estático puro |
| `--dry-run` | `./scripts/db-query.sh --dry-run --force -f src/sql/x.sql` | sim, dentro de `BEGIN`/`ROLLBACK` |
| `--psql` | `./scripts/db-query.sh --psql -f src/sql/x.sql` ou `--psql "SQL; SQL;"` | sim, via `psql`; **aplica** |

Flags: `-f` / `--file=` (arquivo de entrada), `--force` (libera comandos
destrutivos no lint), `--output` (repassada ao modo normal).

O que o lint (`--check`) bloqueia, por statement e ignorando comentários:

- `DROP TABLE`, `DROP COLUMN/SCHEMA/DATABASE`, `TRUNCATE` — exigem `--force`.
- `DELETE`/`UPDATE` sem `WHERE` — exige `--force`. Neste repo isso é falso
  positivo no `before update on public.alunos` do trigger, então
  `src/sql/001_schema.sql` sempre roda com `--force`.
- `ADD COLUMN ... NOT NULL` sem `DEFAULT` — erro sempre, `--force` não libera
  (quebraria numa tabela com linhas).
- Avisos (não bloqueiam): `CREATE TABLE` sem `IF NOT EXISTS` e DDL
  não-transacional (`CONCURRENTLY`, `ALTER TYPE ... ADD VALUE`, `VACUUM`,
  `REINDEX`).

Nos modos `--dry-run` e `--psql` com `-f`, o arquivo passa pelo lint antes; no
`--psql` inline não há lint. O `--dry-run` classifica a transação do arquivo em
três casos — `wrap` (sem `BEGIN`/`COMMIT` próprio: embrulha direto), `strip`
(exatamente um `BEGIN` inicial e um `COMMIT` final: remove os dois e embrulha)
e `refuse` (qualquer outra combinação: recusa, para não arriscar aplicar de
verdade). Antes de rodar, ele confere que nenhum `COMMIT` sobreviveu no payload.

Modo normal (`supabase db query`) não aceita multi-statement nem meta-commands
(`\d`, `\dp`, `\du`): quando falha e detecta isso, o script imprime a dica de
rodar o mesmo SQL com `--psql`. `--psql` e `--dry-run` usam `PG*` via
`python3` para parsear a URL (senha com caractere especial não vira argumento de
argv) e exigem `psql` no PATH (`brew install libpq`).

## `scripts/vercel-env.sh`

Gerencia variáveis de ambiente e deploys da Vercel pela API, sem o CLI
interativo.

| Comando | O que faz |
|---|---|
| `./scripts/vercel-env.sh pull` | traz as variáveis para o `.env.local` |
| `./scripts/vercel-env.sh list` | lista os **nomes** das variáveis (sem valores) |
| `./scripts/vercel-env.sh deploy` | dispara deploy de preview |
| `./scripts/vercel-env.sh deploy prod` | dispara deploy de produção |

Credenciais: `VERCEL_TOKEN` e `VERCEL_ORG_ID` vêm de `~/.claude/.env.tokens`,
`VERCEL_PROJECT_ID` do `.env.local` do projeto. Nada disso é lido pelo app.

## Tipos de rota gerados pelo Next

O Next 16 gera os tipos de rota no build/typegen e os declara **globais** em
`.next/types/routes.d.ts` (mais `.next/types/root-params.d.ts`), importados por
`next-env.d.ts`:

- `PageProps<"/alunos/[slug]">` → `params` e `searchParams` como `Promise`.
  Usado em `src/app/alunos/[slug]/page.tsx`.
- `LayoutProps<"/">` → usado em `src/app/layout.tsx`.
- `RouteContext<"/adm/[chave]">` → usado em `src/app/adm/[chave]/route.ts`.

Por isso `params` é sempre `await`ado (`const { slug } = await params`). O
`tsconfig.json` inclui `.next/types/**/*.ts` e `.next/dev/types/**/*.ts`, e o
`.gitignore` ignora `next-env.d.ts` e o próprio `.next/`: nada disso é
versionado, e o `typecheck` depende de um `next dev`/`next build` ter rodado
pelo menos uma vez na máquina. Numa máquina limpa, rode `npm run build` (ou
`next typegen`) antes do `npm run typecheck`, senão o `PageProps` não existe.

## `AGENTS.md` gerado pelo `next dev`

O `next dev` reescreve o bloco `<!-- BEGIN:nextjs-agent-rules -->` no
`AGENTS.md`, avisando que esta versão do Next tem breaking changes e que a
documentação relevante está em `node_modules/next/dist/docs/`. O bloco é
re-adicionado a cada execução: removê-lo do diff só recria a alteração não
commitada. O arquivo ainda aponta para o índice de docs do `.context`.
`CLAUDE.md` contém só `@AGENTS.md`.

## Contexto do projeto

`.context/` (dotcontext) é a base de conhecimento compartilhada entre as
ferramentas de IA que trabalham no repo: `docs/` (esta documentação),
`agents/` (playbooks) e `skills/`. O `.gitignore` ignora o estado de runtime
(`.context/runtime/`, `.context/cache/semantic/`, `.context/plans/` e
`.context/**/archive/`), então só o conteúdo curado é versionado.
