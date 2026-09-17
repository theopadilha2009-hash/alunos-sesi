---
type: skill
name: Bug Investigation
description: Investigar bug ou comportamento inesperado no alunos-sesi a partir do caminho real (vitrine /alunos, painel /adm, voto /api/estrela). Use quando algo quebra, quando o cookie de sessão parece não existir, quando o ADM devolve 404 com a chave certa, quando a estrela volta sozinha, ou quando o typecheck reclama de arquivo que ninguém tocou.
skillSlug: bug-investigation
phases: [E, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Reproduza pelo caminho real antes de mexer: `npm run dev` e passe pela tela (vitrine em `/alunos`, painel em `/adm`, voto em `/api/estrela`).
2. Cole o erro cru — stack do terminal, corpo da resposta da rota, output de `npm run typecheck`. Sem isso o diagnóstico é chute.
3. Localize a camada, nesta ordem: `src/proxy.ts` (cookie do visitante) → `src/app/**` (página, Route Handler, Server Action) → `src/lib/dados.ts` (leitura) → `src/sql/001_schema.sql` (RLS, constraint, trigger).
4. Leia o schema antes de culpar o código: boa parte dos "bugs" daqui é constraint (`github_handle`, `linkedin_url`, a CHECK de `slug`) ou RLS recusando leitura anônima.
5. Forme uma hipótese única e teste com um comando da seção de diagnóstico.
6. Corrija a causa, não o sintoma. Alvo é função pura de `src/lib/` → escreva o teste que falha em `tests/puros.test.mjs` antes do fix.
7. Feche com `npm run typecheck && npm test && npm run build`.

## Onde olhar primeiro

| Sintoma | Camada |
|---|---|
| Estrela acende e volta sozinha | `src/components/Vitrine.tsx` faz update otimista e desfaz no `catch` — a resposta de `/api/estrela` veio não-ok |
| `/api/estrela` responde 400 "Sem identidade de visitante" | `src/proxy.ts` não rodou (arquivo renomeado ou matcher sem a rota) ou o cookie `sesi.visitante` foi limpo no meio da navegação |
| ADM devolve 404 mesmo com a chave certa | `ADM_CHAVE` ausente/vazia no `.env.local`, ou com espaço/quebra de linha colada no `vercel env add` — `chaveValida()` compara byte a byte e não tolera sobra |
| Painel grava no banco e a vitrine não muda | Server Action esqueceu `revalidar()` (que revalida `/alunos` e `/adm`) |
| Vitrine vazia com o banco cheio | leitura anônima passando pela RLS: falta a policy de select em `public.alunos`/`public.salas`, ou o `.env.local` está com a anon key errada |
| `npm run typecheck` quebra em arquivo fora do seu diff | tipos de rota gerados em `.next/types` desatualizados (veja Next 16 abaixo) |
| Build passa e a página quebra em produção | env var ausente na Vercel: o CI compila com valores de mentira de propósito |

## Armadilhas do Next 16 neste repositório

- **`src/proxy.ts`, não `middleware.ts`.** No Next 16 Middleware virou Proxy: o arquivo precisa se chamar `proxy.ts` e exportar `proxy` (o `config.matcher` continua valendo). Renomear para `middleware.ts` não quebra o build — o cookie `sesi.visitante` só para de ser emitido, e o sintoma aparece longe da causa, no voto.
- **`cookies()` é assíncrono.** `await cookies()` em `src/app/adm/acoes.ts`, `src/app/adm/page.tsx`, `src/app/alunos/page.tsx` e `src/app/api/estrela/route.ts`. O acesso síncrono foi removido no 16.
- **`params` é Promise.** `const { slug } = await params` em `src/app/alunos/[slug]/page.tsx`; `const { chave } = await ctx.params` em `src/app/adm/[chave]/route.ts`, tipado como `RouteContext<"/adm/[chave]">`.
- **Tipos globais de rota são gerados.** `PageProps<"/alunos/[slug]">`, `RouteContext<...>` e `LayoutProps<"/">` vêm de `.next/types` (incluído no `tsconfig.json`). Depois de criar ou renomear rota, rode `npm run build` antes do `npm run typecheck` — senão o erro é de tipo ausente, não de código.
- **Arquivo `"use server"` só exporta função async.** Por isso o tipo `Estado` e o `ESTADO_INICIAL` moram em `src/app/adm/estado.ts`. Erro de build sobre export não-async em `src/app/adm/acoes.ts` se conserta movendo o valor para `estado.ts`.
- **Server Action não passa pelo proxy.** O `matcher` de `src/proxy.ts` não cobre o POST da ação, então a guarda `exigirAdm()` mora dentro de cada ação em `src/app/adm/acoes.ts`. Ação sem a guarda funciona sem cookie — e isso não aparece no build.
- **`service_role` atravessa a RLS.** `clienteAdmin()` não reclama de policy errada; quem reclama é `clientePublico()`. Para testar leitura pública, use o cliente anon.
- **Leitura de `votos` com o cliente público falha por desenho.** A tabela não tem policy nenhuma; quem lê voto é `votosDoVisitante()` em `src/lib/dados.ts`, com `clienteAdmin()`, sempre filtrado pelo id que veio do cookie assinado.

## Comandos de diagnóstico

```bash
npm run typecheck                 # erro de tipo, incluindo os tipos de rota gerados
npm test                          # funções puras de src/lib/
npm run build                     # pega erro de "use server", de rota e de boundary de cliente

grep -rn "sesi.visitante\|COOKIE_VISITANTE" src/   # quem lê e quem escreve o cookie do voto
grep -rn "ADM_CHAVE" src/                          # só src/lib/sessao.ts deve aparecer

# estado real do banco (o script lê SUPABASE_DB_URL do .env.local)
./scripts/db-query.sh --psql "select nome, slug, estrelas from public.alunos order by estrelas desc limit 5;"
./scripts/db-query.sh --psql "select * from pg_policies where schemaname = 'public';"
./scripts/db-query.sh --psql "select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.alunos'::regclass;"
```

`--psql` é o modo que aceita multi-statement e meta-comandos (`\d`, `\dp`, `\dt`) — é o que serve para investigar RLS e schema. `--dry-run` roda dentro de `BEGIN`/`ROLLBACK` e serve para ensaiar um SQL de correção sem deixar rastro.

## Exemplo de nota de investigação

```
## Bug: estrela não conta na vitrine

### Reprodução
1. npm run dev, abrir /alunos
2. clicar na estrela do primeiro cartão
3. a estrela acende e apaga no mesmo segundo

### Coleta
- Network: POST /api/estrela -> 400 {"erro":"Sem identidade de visitante — recarregue a página."}
- document.cookie não mostra sesi.visitante (esperado: httpOnly)

### Causa
O arquivo src/proxy.ts estava nomeado middleware.ts. O Next 16 não carrega
middleware.ts como Proxy, então nenhum cookie foi emitido e a rota do voto
recusa por falta de identidade. O build e os testes passaram os dois.

### Correção
Renomear para src/proxy.ts mantendo o export `proxy` e o config.matcher.
```

## Quality Bar

- Reproduza antes de investigar. Sem reprodução, diga "não reproduzi" em vez de "corrigi".
- Um bug por vez: correção e refactor não vão no mesmo commit.
- Bug de banco se conserta em `src/sql/001_schema.sql` (fonte única do schema) e se aplica com `./scripts/db-query.sh --psql --force -f src/sql/001_schema.sql` — nunca por ajuste manual no painel do Supabase, que some no próximo deploy.
- Bug em função pura → teste falhando primeiro em `tests/puros.test.mjs`.
- Feche com o output real de `npm run typecheck`, `npm test` e `npm run build`.

## Resource Strategy

- `scripts/`: só quando a investigação virar checagem repetível (ex.: um script de auditoria de RLS em cima do `scripts/db-query.sh`).
- `references/`: só para um dump grande (stack trace, log de build) que não caiba nesta skill.
- `assets/`: nada — esta skill não gera arquivo de saída.
