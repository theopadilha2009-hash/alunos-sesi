---
type: agent
name: Bug Fixer
description: Analyze bug reports and error messages
agentType: bug-fixer
phases: [E, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Bug Fixer — alunos-sesi

Este projeto roda **Next.js 16.3.5**, onde várias convenções mudaram em relação
ao que a maioria dos modelos tem na memória. Antes de qualquer hipótese sobre
causa raiz, confirme a convenção real em `node_modules/next/dist/docs/`.

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [bug-investigation](./../skills/bug-investigation/SKILL.md) | Investigate bugs systematically and perform root cause analysis. Use when Investigating reported bugs, Diagnosing unexpected behavior, or Finding the root cause of issues |

## Armadilhas do Next 16 neste repo

| Sintoma | Causa real | Onde olhar |
|---|---|---|
| "middleware não roda" / cookie `sesi.visitante` nunca aparece | Aqui não existe `middleware.ts`. O arquivo é **`src/proxy.ts`** e exporta `proxy(request)` | `src/proxy.ts`, doc `01-app/01-getting-started/16-proxy.md` |
| `cookies() is not a function` / retorno estranho | `cookies()` de `next/headers` é **assíncrono** — precisa de `await` | `src/app/alunos/page.tsx`, `src/app/adm/page.tsx`, `src/app/adm/acoes.ts`, `src/app/api/estrela/route.ts` |
| `slug` chega como `[object Promise]` ou o perfil 404a sempre | `params` é **Promise**: `const { slug } = await params` | `src/app/alunos/[slug]/page.tsx`, `src/app/adm/[chave]/route.ts` |
| `PageProps`/`LayoutProps`/`RouteContext` "não existe" | São tipos globais gerados em `.next/types` e `.next/dev/types`. Sem `.next` gerado, o `tsc` não acha | rodar `npm run build` (ou `npm run dev` uma vez) e repetir `npm run typecheck` |
| O tema pisca claro antes de escurecer | O script anti-FOUC de `src/app/layout.tsx` saiu do `<head>` ou mudou de chave | `localStorage.getItem('sesi.tema')` e `data-theme` |
| Server Action responde 200 mas nada muda | Falta `revalidatePath` | `revalidar()` em `src/app/adm/acoes.ts` |
| Ação do ADM executa sem estar logado | Guarda ausente: toda action precisa de `exigirAdm()`. O `proxy.ts` **não** cobre Server Action | topo de cada função em `src/app/adm/acoes.ts` |

## Sintomas de domínio e a causa provável

- **Estrela não acende / número não anda.** O voto depende de três peças: cookie
  `sesi.visitante` válido (assinado com `ADM_CHAVE`), `alunoId` em formato UUID
  (regex `RE_UUID` em `src/app/api/estrela/route.ts`) e a linha em `public.votos`
  (que **não tem policy nenhuma**). Sem `ADM_CHAVE`, o `proxy.ts` loga
  `[proxy] não consegui assinar o cookie do visitante` e segue sem identidade —
  o POST então devolve 400 "Sem identidade de visitante".
- **Contagem de estrelas diferente do número de linhas em `votos`.** A coluna
  `alunos.estrelas` é mantida pelo trigger `sync_estrelas`
  (`src/sql/001_schema.sql`). Inserção direta em `votos` por fora, ou um
  `update` manual em `alunos.estrelas`, dessincroniza.
- **A vitrine mostra "não conseguimos carregar a turma".** É o `catch` de
  `src/app/alunos/page.tsx`, que existe justamente para não confundir falha de
  leitura com lista vazia. Olhe o `console.error("[alunos] falha ao ler do Supabase")`.
- **Importação ignora um link que a pessoa preencheu.** Por desenho: a
  importação nunca sobrescreve `linkedin`/`github` já cadastrado — só preenche o
  que falta (`src/app/adm/acoes.ts`). Não é bug; se o pedido é sobrescrever, é
  mudança de comportamento, não correção.
- **"joao" não acha "João".** O `fold` de `src/lib/busca.ts` normaliza NFD,
  remove `\p{M}`, baixa a caixa e trata `º`/`ª`. Se a busca parou de casar
  acento, o suspeito é essa cadeia, não o componente.
- **Duas pessoas com o mesmo nome viram um aluno só.** A chave de identidade na
  importação é `fold(nome)|sala_id`. Nomes iguais na mesma sala são o mesmo
  aluno por definição do projeto.
- **404 no `/adm` mesmo com a chave certa.** O crachá é um HMAC de `adm-v1` com
  `ADM_CHAVE` (`src/lib/sessao.ts`). Trocar `ADM_CHAVE` invalida todos os
  crachás e todos os votos por cookie — comportamento esperado.
- **Chave errada devolve 404, não 401.** É de propósito
  (`src/app/adm/[chave]/route.ts`): 401 confirmaria que a rota existe.

## Fluxo de trabalho

1. **Reproduza antes de mexer.** Para lógica pura, o caminho mais rápido é
   escrever o caso que falha em `tests/puros.test.mjs` e rodar só ele:
   `node --experimental-strip-types --test tests/puros.test.mjs`.
2. **Colete o erro real.** Em desenvolvimento, o `npm run dev` mostra o
   `console.error` prefixado (`[alunos]`, `[proxy]`). Em produção, o log da
   Vercel.
3. **Localize a camada.** Tela (`src/components/`, `src/app/*/page.tsx`) →
   ponte (`src/lib/dados.ts`) → dado (`src/sql/001_schema.sql`). Só desça uma
   camada por vez, confirmando a anterior.
4. **Hipótese única.** Uma frase: "X falha porque Y". Se o fix não confirma a
   frase, a hipótese estava errada — não empilhe patches.
5. **Corrija na camada certa.** Bug de normalização se corrige em `src/lib/`,
   não no componente. Bug de contagem se corrige no trigger, não na tela.
6. **Regressão.** Se o bug era de função pura, o teste que reproduz fica no
   repositório. Se era de integração (banco, cookie, redirect), registre no
   relatório o comando manual exato que valida o fix.
7. **Depois de dois fixes superficiais que não resolveram, vá vertical:**
   caller → callee → dado → schema.

## Checks de qualidade

```bash
npm run typecheck
npm test
npm run build
node --experimental-strip-types --test tests/puros.test.mjs
```

- Para bug de banco, confira o estado real antes de concluir:
  `./scripts/db-query.sh --psql "select count(*) from public.votos"` e
  `./scripts/db-query.sh --psql "select id, nome, estrelas from public.alunos order by estrelas desc limit 10"`.
- Nunca declare "corrigido" sem colar a saída do comando que rodou. Sem
  possibilidade de rodar, escreva "não executado" e o comando que falta.
