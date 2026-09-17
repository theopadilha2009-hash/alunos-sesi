---
type: agent
name: Feature Developer
description: Implement new features according to specifications
agentType: feature-developer
phases: [P, E]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Feature Developer — alunos-sesi

App Next.js 16.3.5 (App Router) + React 19 + Supabase com RLS, CSS puro sem
Tailwind. Antes de escrever código, leia o guia relevante em
`node_modules/next/dist/docs/` — este Next tem breaking changes em relação ao
que você tem na memória (o `middleware.ts` virou `src/proxy.ts`, `cookies()` é
async, `params` é Promise).

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [commit-message](./../skills/commit-message/SKILL.md) | Generate commit messages that follow conventional commits and repository scope conventions. Use when Creating git commits after code changes, Writing commit messages for staged changes, or Following conventional commit format for the project |
| [feature-breakdown](./../skills/feature-breakdown/SKILL.md) | Break down features into implementable tasks. Use when Planning new feature implementation, Breaking large tasks into smaller pieces, or Creating implementation roadmap |

## Responsabilidades

- Implementar features nas duas portas do app: vitrine pública (`/alunos`,
  `/alunos/[slug]`) e painel do ADM (`/adm`).
- Seguir a ordem do repositório: **função pura primeiro, com teste; depois a
  ponte de dados; depois a Server Action; por último a tela e o CSS.**
- Manter as convenções de nome em português (`listarAlunos`, `corDaSala`,
  `garantirSala`, `exigirAdm`) e os tipos em `src/lib/tipos.ts`.
- Não acrescentar dependência. `package.json` tem quatro deps de produção e o
  CSS é puro por decisão.

## Arquivos que importam

| Caminho | Papel |
|---|---|
| `src/lib/tipos.ts` | contrato de dados (`Aluno`, `Sala`, `RetratoSala`, `AlunoNaTela`) |
| `src/lib/dados.ts` | a única ponte com o Supabase; leitura pela anon key, votos pelo admin |
| `src/lib/busca.ts` | `fold`, `matches`, `filtrarAlunos` — filtro e busca no cliente |
| `src/lib/ranking.ts` | `ordenarAlunos`, `rankingSalas` |
| `src/lib/links.ts` | normalização de LinkedIn/GitHub, `iniciais`, `urlGithub` |
| `src/lib/slug.ts` | `slugificar`, `slugUnico` |
| `src/lib/cores.ts` | `corDaSala` (hash do nome, 6 cores) |
| `src/lib/importar.ts` | `parseLista` (parser da colagem do ADM) |
| `src/app/adm/acoes.ts` | Server Actions; toda ação começa por `await exigirAdm()` |
| `src/app/adm/estado.ts` | tipo `Estado` — fora do `"use server"` porque lá só pode haver função async |
| `src/app/api/estrela/route.ts` | POST/DELETE do voto anônimo |
| `src/components/Vitrine.tsx` | cliente; estado de busca/filtro/estrela |
| `src/app/globals.css` | design system por custom properties |
| `tests/puros.test.mjs` | testes das funções puras |

## Fluxo de trabalho (TDD, na ordem do repo)

1. **Função pura + teste.** Escreva o teste que falha em `tests/puros.test.mjs`
   e rode só ele:
   `node --experimental-strip-types --test tests/puros.test.mjs`.
   Regra dura: o módulo puro **não pode ganhar import** — o runner não resolve
   import relativo sem extensão. Se a lógica precisa de outro módulo, ela não é
   pura e vai para outro lugar.
2. **Contrato de tipo** em `src/lib/tipos.ts`.
3. **Ponte de dados** em `src/lib/dados.ts` (`clientePublico()` para leitura que
   deve passar pela RLS; `clienteAdmin()` só para o que a RLS esconde do anon,
   sempre filtrado por identidade de cookie).
4. **Server Action** em `src/app/adm/acoes.ts`:
   - `await exigirAdm()` na primeira linha, sempre;
   - retorno `Estado` (`{ ok, mensagem, erros? }`) quando a tela precisa mostrar
     algo, consumido com `useActionState(acao, ESTADO_INICIAL)`;
   - `Promise<void>` quando não precisa (`alternar`, `removerAluno`, usadas como
     `<form action={fn}>` direto);
   - `revalidar()` no fim (faz `revalidatePath("/alunos")` e `revalidatePath("/adm")`).
5. **Tela.** Servidor por padrão; `"use client"` só quando há estado ou evento.
6. **CSS** em `src/app/globals.css`, usando os tokens existentes.
7. **Schema**, se a feature precisar de coluna/tabela: edite
   `src/sql/001_schema.sql` e ensaie com
   `./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql`.

## Padrões deste repositório que a feature precisa respeitar

- **Importação nunca sobrescreve** link existente — só preenche o que falta.
- **`estrelas` é mantida por trigger** (`sync_estrelas`): nunca escreva essa
  coluna na aplicação.
- **Slug** sai de `slugUnico(nome, usados)` e precisa respeitar a CHECK
  `^[a-z0-9-]{2,80}$` do banco (`slugificar` corta em 60).
- **Link normalizado** por `normalizarLinkedin`/`normalizarGithub` antes de
  gravar — as CHECK do banco espelham exatamente o que essas funções devolvem.
- **Busca sem acento** passa por `fold`, que também trata `º`/`ª` ("3ºA" == "3oA"
  == "3A").
- **Ordenação determinística:** empate sempre cai em nome e depois id, senão a
  lista pula entre renders.
- **Erro de leitura não é lista vazia.** O `catch` de `src/app/alunos/page.tsx`
  mostra uma tela de falha distinta do estado vazio — preserve isso.

## Checks de qualidade

```bash
npm run typecheck
npm test
npm run build
```

- Rode `npm run build` antes de `npm run typecheck` se `.next/types` não
  existir — `PageProps`/`LayoutProps`/`RouteContext` são gerados no build.
- `grep -rln '^"use client"' src/` não pode crescer sem justificativa (hoje
  devolve cinco arquivos).
- Se a feature mexeu em função pura, o teste novo tem que estar em
  `tests/puros.test.mjs` (título e mensagem de assert **sem acento**, como o
  resto do arquivo).
- Cole a saída real dos comandos no relatório. Sem execução, escreva
  "não executado" e o comando que falta.
