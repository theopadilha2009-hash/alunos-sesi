---
type: skill
name: Pr Review
description: Revisar pull request do alunos-sesi com o que o CI cobre (typecheck, testes das funções puras, build) e o que ele não cobre (RLS, painel do ADM, voto, CSS). Use quando for revisar um PR antes do merge, avaliar um diff vindo de outra sessão ou worktree, ou decidir se um PR está pronto para entrar na main.
skillSlug: pr-review
phases: [R, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Entenda o objetivo: `gh pr view <numero>` e a descrição. Sem objetivo claro, o review começa pedindo isso.
2. Veja o escopo: `git fetch origin && git diff origin/main...HEAD --stat`. Arquivo fora do assunto do PR é comentário imediato.
3. Confira o CI: `gh pr checks <numero>`. O job `verificar` de `.github/workflows/ci.yml` roda `npm ci`, `npm run typecheck`, `npm test` e `npm run build` (o build com env de mentira).
4. Rode local o mesmo que o CI roda: `npm run typecheck && npm test && npm run build`.
5. Passe o checklist por caminho tocado (tabela abaixo).
6. Verifique na mão o que o CI não alcança — é onde mora o risco real deste repo.
7. Feche com veredito: aprovado, aprovado com sugestões, ou mudanças pedidas com a lista numerada.

## Checklist por caminho tocado

| Caminho no diff | O que exigir |
|---|---|
| `src/sql/001_schema.sql` | saída de `./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql`; arquivo continua idempotente; RLS ligada na tabela nova e policy explícita (ou a ausência dela justificada) |
| `src/lib/busca.ts`, `importar.ts`, `links.ts`, `ranking.ts`, `slug.ts`, `cores.ts` | continuam sem nenhum import; teste novo em `tests/puros.test.mjs`; regex ainda espelhando as constraints do SQL |
| `src/lib/dados.ts` | leitura pública por `clientePublico()`, leitura/escrita privada por `clienteAdmin()`, erro sempre propagado como `Error` com o nome da função |
| `src/app/adm/acoes.ts` | `await exigirAdm()` na primeira linha de cada `export async function`; `revalidar()` no fim de cada mutação; nenhum valor exportado além de função async (tipo e constante vão para `src/app/adm/estado.ts`) |
| `src/app/adm/[chave]/route.ts` | chave conferida com `chaveValida()` (tempo constante), resposta de erro ainda 404 e não 401, chave nunca renderizada em HTML |
| `src/app/api/estrela/route.ts` | identidade vinda de `cookies()` e nunca do corpo; `alunoId` validado contra `RE_UUID`; `upsert` com `ignoreDuplicates` para não contar voto repetido |
| `src/proxy.ts` | arquivo continua com esse nome (no Next 16, `middleware.ts` não é carregado); `matcher` continua cobrindo as rotas que precisam do cookie |
| `src/components/**` com `"use client"` | nenhum import de `@/lib/supabase/admin` nem de `@/lib/sessao`; nenhum segredo em prop ou em `NEXT_PUBLIC_*` |
| `src/app/globals.css` + `src/components/**` | classe renomeada nos dois lados; cor saindo de token, sem hex solto no `.tsx` |
| `.github/workflows/ci.yml` | continua rodando typecheck, test e build; env de mentira mantido (o CI não conecta no Supabase de propósito) |
| `README.md` / `.env.example` | variável nova aparece nos dois; nenhum valor de chave no texto |
| `AGENTS.md` | reescrito pelo `next dev` — é esperado no diff, não é ruído para pedir remoção |

## O que o CI não prova

- RLS aplicada no banco de verdade: `./scripts/db-query.sh --psql "select * from pg_policies where schemaname = 'public';"`.
- O caminho do ADM no navegador: `/adm/<chave>` → 303 com cookie `sesi.adm`, e chave errada → 404.
- O voto de ponta a ponta: POST e DELETE em `/api/estrela` mexendo em `estrelas` uma vez por navegador.
- O CSS: não existe lint nem teste visual. Alinhamento, tema claro/escuro e o `--sala` de cada ficha só se vê rodando.
- A importação em massa: `parseLista` tem teste, mas o insert real e o `garantirSala` não.

Se o PR toca em qualquer um desses pontos e o autor não colou evidência, peça antes de aprovar.

## Exemplos de comentário

```
Mudanças pedidas:

1. src/app/adm/acoes.ts: a ação `exportarTurma` não chama exigirAdm().
   O matcher de src/proxy.ts não cobre o POST da Server Action, então
   a rota fica aberta. Guarda na primeira linha, como as outras quatro.

2. src/lib/importar.ts: o import de `fold` quebra npm test
   (ERR_MODULE_NOT_FOUND). O módulo é folha para o node --test carregar
   direto — a normalização precisa descer para cá ou virar módulo folha.

3. Sem teste em tests/puros.test.mjs para o novo limite de nome. Um caso
   com 121 caracteres, igual à CHECK de public.alunos, basta.
```

```
Aprovado.

Conferi: typecheck, npm test (27 passando) e build verdes; a ação nova
chama exigirAdm() e revalidar(); o regex de LinkedIn continua igual à
constraint linkedin_url; nenhum import de service_role em componente
de cliente. RLS não foi tocada, então não precisei rodar o db-query.
```

## Quality Bar

- Objetivo do PR entendido antes do diff; se o PR faz duas coisas, peça a quebra em vez de revisar as duas de uma vez.
- Comentário aponta arquivo e comportamento, com o porquê. Nada de "não gostei".
- Bloqueio: `service_role` alcançável do cliente, ação sem `exigirAdm()`, módulo folha ganhando import, regex divergindo da CHECK do SQL, RLS nova sem policy, chave do ADM aparecendo em HTML.
- Sugestão: nome, extração, ordem, texto de mensagem, acessibilidade.
- CI verde é condição necessária, não suficiente: sem lint e sem teste de banco, o review é a última barreira.
- Não empilhe PRs na mesma sessão; um review por PR, do começo ao fim.
- Nunca aprove sem ter rodado os comandos; se não rodou, diga "não executado: <razão>".

## Resource Strategy

- `scripts/`: só se o review repetir uma checagem (ex.: comparar `RE_GITHUB` com a constraint `github_handle` direto no banco).
- `references/`: só para um roteiro longo de verificação manual que não caiba aqui.
- `assets/`: nada.
