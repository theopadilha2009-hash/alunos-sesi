---
type: agent
name: Devops Specialist
description: Design and maintain CI/CD pipelines
agentType: devops-specialist
phases: [E, C]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# DevOps Specialist — alunos-sesi

Infra deste projeto: CI no GitHub Actions, deploy na Vercel por CLI (mais os
scripts que trocam env sem o CLI da Vercel) e o schema no Supabase via
`scripts/db-query.sh`. **Nunca** faça login interativo de `supabase` nem
`vercel` — tudo aqui é não-interativo e lê as credenciais do `.env.local` e de
`~/.claude/.env.tokens`.

## Responsabilidades

- Manter `.github/workflows/ci.yml` verde (typecheck + test + build).
- Orquestrar env vars na Vercel antes do primeiro deploy de produção.
- Aplicar/e ensaiar mudanças de schema via `scripts/db-query.sh`.
- Trocar env entre local e Vercel sem `vercel env` interativo.

## Arquivos que importam

| Caminho | Papel |
|---|---|
| `.github/workflows/ci.yml` | CI: node 22, `npm ci`, `typecheck`, `test`, `build` com env de mentira |
| `.env.example` | os **nomes** oficiais das variáveis (valores nunca vão pro git) |
| `.env.local` | valores reais; gitignored; dedo no gatilho dos scripts |
| `scripts/db-query.sh` | roda SQL no Supabase sem `supabase login`: `--check`, `--dry-run`, `--psql`, e o modo `run` padrão |
| `scripts/vercel-env.sh` | `pull`, `list`, `deploy [prod]` via API da Vercel |
| `src/sql/001_schema.sql` | schema, RLS e triggers — fonte única do banco |

## Variáveis de ambiente

Do `.env.example`, com o papel real de cada uma:

| Variável | Domínio | Observação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | criada com `vercel env add ... production/preview/development` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + servidor | leitura pública, passa pela RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor | escrita e votos; **nunca** no browser |
| `SUPABASE_DB_URL` | só script | conexão direta do `db-query.sh`; o app não lê |
| `ADM_CHAVE` | só servidor | chave do link secreto do `/adm`; trocar invalida crachás e votos |
| `VERCEL_TOKEN` | só CLI | deploy; o app não lê |
| `VERCEL_PROJECT_ID` | só script | lida de `.env.local` pelo `vercel-env.sh` |

O CI injeta valores de mentira para `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `ADM_CHAVE` só
para o build não explodir — nada conecta.

## Fluxo de trabalho

### Deploy para a Vercel

Sem `vercel login`. Duas trilhas equivalentes:

- **CLI** (documentado no `README.md`):
  ```bash
  vercel link
  vercel env add NEXT_PUBLIC_SUPABASE_URL production   # e as demais
  vercel deploy --prod --yes --token "$VERCEL_TOKEN"
  ```
- **Script** (sem a CLI da Vercel): `./scripts/vercel-env.sh deploy prod`
  (aceita `preview`/`prod`); `... deploy` sem argumento faz preview.

**Ordem obrigatória:** as variáveis precisam existir na Vercel **antes** do
primeiro deploy de produção. Sem elas o build passa, mas as páginas quebram em
runtime (as rotas de servidor lançam "Faltam NEXT_PUBLIC_SUPABASE_URL /
NEXT_PUBLIC_SUPABASE_ANON_KEY" — veja `src/lib/supabase/*.ts`).

### Banco (schema novo)

1. Edite `src/sql/001_schema.sql` (é a fonte única; não crie arquivo SQL solto).
2. Lint offline: `./scripts/db-query.sh --check -f src/sql/001_schema.sql`.
3. Ensaia de verdade dentro de `BEGIN; ROLLBACK;`:
   `./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql`
   (o `--force` libera o `UPDATE` sem `WHERE` do trigger — falso positivo do
   lint, documentado no próprio arquivo).
4. Aplica: `./scripts/db-query.sh --psql -f src/sql/001_schema.sql`.

Regras do lint do `db-query.sh` que você deve respeitar: bloqueia
`DROP TABLE/COLUMN/SCHEMA/DATABASE`, `TRUNCATE`, e `DELETE/UPDATE` sem `WHERE`
(libera com `--force`); **sempre** bloqueia `ADD COLUMN ... NOT NULL` sem
`DEFAULT`; avisa sobre `CREATE TABLE` sem `IF NOT EXISTS`.

### Auditoria/leitura ad-hoc

Multi-statement e meta-comandos usam `--psql` (o `supabase db query` rejeita
multi-statement):

```bash
./scripts/db-query.sh --psql "select * from pg_policies"
./scripts/db-query.sh --psql "\d public.votos"
```

O `--psql` remove o `COMMIT` de arquivos com transação própria e recusa casos
ambíguos — isso é invariante de segurança, não gaste tempo contornando.

### Env entre local e Vercel

`./scripts/vercel-env.sh pull` mantém entradas manuais (comentários,
`SUPABASE_DB_URL`, `VERCEL_PROJECT_ID`) e junta as de development da Vercel sob
um marcador `# [vercel] Pulled <data>`. `list` mostra os nomes e targets sem
valores.

## Checks de qualidade

```bash
npm run typecheck
npm test
npm run build
./scripts/db-query.sh --check -f src/sql/001_schema.sql
./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql
./scripts/vercel-env.sh list
```

- Confirme que o CI passou no PR antes de self-merge (trust-the-CI: verde basta).
- Backfill de env novo exige atualizar `.env.example` **e** `README.md` na mesma
  mudança — senão o time não sabe que a variável existe.
- Nunca comite `.env.local` nem `.env`. O `.gitignore` mantém `.env*` e libera
  só o `!.env.example`.
