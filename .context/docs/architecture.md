---
type: doc
name: architecture
description: System architecture, layers, patterns, and design decisions
category: architecture
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Arquitetura

Um app Next.js só, com duas portas (vitrine pública e painel do ADM). Não há
backend separado, fila, cron ou serviço próprio: as páginas de servidor leem
direto do Supabase e as escritas passam por Server Actions e Route Handlers.

## Stack

| Camada | O que é | Onde |
|---|---|---|
| Framework | Next 16.3.5, App Router | `src/app/`, `next.config.ts` |
| UI | React 19.2.8, CSS puro com custom properties | `src/components/`, `src/app/globals.css` |
| Tipos | TypeScript strict, `tsc --noEmit` | `tsconfig.json` |
| Dados | Supabase (Postgres + RLS), `@supabase/supabase-js` ^2.58 | `src/lib/supabase/`, `src/sql/001_schema.sql` |
| Testes | `node:test` com `--experimental-strip-types` | `tests/puros.test.mjs` |
| Deploy | Vercel, por CLI | `scripts/vercel-env.sh` |

Três dependências de runtime apenas: `next`, `react`, `react-dom` e
`@supabase/supabase-js`.

## Mapa de rotas

| Rota | Arquivo | Tipo | Quem entra |
|---|---|---|---|
| `/` | `src/app/page.tsx` | página (server) | qualquer um |
| `/alunos` | `src/app/alunos/page.tsx` | página (server) | qualquer um |
| `/alunos/[slug]` | `src/app/alunos/[slug]/page.tsx` | página (server) | qualquer um |
| `/adm` | `src/app/adm/page.tsx` | página (server) | só com o crachá; sem ele, `notFound()` |
| `/adm/[chave]` | `src/app/adm/[chave]/route.ts` | Route Handler `GET` | quem tem a chave; é o que emite o crachá |
| `/api/estrela` | `src/app/api/estrela/route.ts` | Route Handler `POST`/`DELETE` | qualquer visitante com cookie assinado |
| `/robots.txt` | `src/app/robots.ts` | metadata route | `disallow: /adm` |

O layout raiz (`src/app/layout.tsx`) monta as fontes do Google via
`next/font/google` (Manrope e Bricolage Grotesque, expostas como
`--fonte-manrope` e `--fonte-bricolage`) e um script inline que aplica o tema
salvo em `localStorage` antes da primeira pintura, para a página não piscar.

## Separação server/client

Server por padrão. Só cinco arquivos são `"use client"`:

- `src/components/Vitrine.tsx` — busca, filtro, ordenação e o voto otimista.
- `src/components/CartaoAluno.tsx` — o cartão e o botão de estrela.
- `src/components/TemaToggle.tsx` — o botão de tema.
- `src/components/adm/FormAluno.tsx` — `useActionState(criarAluno, ...)`.
- `src/components/adm/ImportarLista.tsx` — `useActionState(importarLista, ...)`
  mais a prévia, que roda `parseLista` no navegador.

Os outros componentes são de servidor, incluindo `src/components/adm/PainelAlunos.tsx`:
cada botão é um `<form action={alternar}>` / `<form action={removerAluno}>`,
então o painel funciona sem JavaScript no cliente.

Dentro de `src/lib/`, dois módulos são **exclusivamente de servidor**:
`sessao.ts` (usa `node:crypto`) e `supabase/admin.ts` (usa a `service_role`).
Nunca importe os dois de um componente `"use client"`.

## Os dois clients Supabase

| Client | Chave | Papel |
|---|---|---|
| `clientePublico()` em `src/lib/supabase/publico.ts` | anon | toda leitura pública, passando pela RLS de propósito |
| `clienteAdmin()` em `src/lib/supabase/admin.ts` | service_role | escrita do painel e votos, sempre no servidor e depois de checar o crachá |

O cliente anon é usado de propósito mesmo onde a `service_role` resolveria: se
uma policy estiver errada, o erro aparece na vitrine em vez de ficar escondido
atrás do service_role. Os dois são criados sem sessão e sem persistência
(`persistSession: false`, `autoRefreshToken: false`) — isto não é login.

`src/lib/dados.ts` é a **única ponte** entre a tela e o Supabase:
`listarSalas`, `listarAlunos`, `listarRetrato`, `alunoPorSlug` saem pelo cliente
público; `votosDoVisitante` é a exceção e sai pelo admin, porque `public.votos`
não tem policy nenhuma — a leitura é sempre filtrada pelo id que veio do cookie
assinado, nunca por algo que o cliente mandou.

## Fluxo de dados

Da página de servidor para o componente de cliente, sempre como props simples:

```
src/app/alunos/page.tsx  (server)
  ├─ cookies() → abrirAssinado(cookie do visitante)      → meusVotos
  └─ Promise.all(listarAlunos, listarSalas, listarRetrato)
        ↓ props
  src/components/Vitrine.tsx  ("use client")
        ├─ naTela  = lista + nome da sala + corDaSala(nome)
        ├─ visiveis = filtrarAlunos(...) → ordenarAlunos(...)   (useMemo)
        ├─ salasRanqueadas = rankingSalas(retrato)              (useMemo)
        └─ estrelar() → fetch /api/estrela → estado otimista com rollback
```

O voto é otimista: `Vitrine` acende a estrela e soma 1 antes da resposta e
desfaz exatamente esse passo se o `fetch` falhar. A resposta do servidor
sobrescreve a contagem com o número real lido do banco.

O painel segue o mesmo desenho: `src/app/adm/page.tsx` checa o crachá, lê
alunos e salas, monta `AlunoNaTela[]` (com `sala` e `cor` já resolvidos) e
entrega para `PainelAlunos`.

`src/app/alunos/page.tsx` trata falha de leitura como falha, não como lista
vazia: o `catch` mostra "Não conseguimos carregar a turma agora" em vez de
"Ninguém aqui", para ninguém recadastrar a turma por causa de um banco fora do
ar.

## O `proxy.ts`

`src/proxy.ts` é o antigo `middleware.ts` — no Next 16 o arquivo mudou de nome
e roda no runtime Node por padrão, que é o que permite usar `node:crypto`. Ele
tem um único trabalho: dar a cada navegador um id anônimo assinado
(`sesi.visitante`), e só isso. Se o cookie já existe e a assinatura confere,
ele não toca em nada. O `matcher` exclui `_next/static`, `_next/image`,
`favicon.ico` e os arquivos de imagem/texto.

Ele **não** protege o painel: Server Actions são POSTs para a rota onde são
usadas, então um matcher que exclui um caminho também pularia a checagem dele.
A guarda do ADM mora em cada Server Action, em `exigirAdm()`.

## Por que não tem Tailwind

O design system inteiro vive em `src/app/globals.css` (957 linhas), com os
tokens como única fonte de verdade:

- Cores e espaçamentos são custom properties (`--ciano`, `--verde`, `--amarelo`,
  `--vermelho`, `--azul`, `--creme`, `--raio`, `--ease`).
- O tema claro/escuro é uma troca de valores de token sob
  `:root[data-theme="light"]` / `[data-theme="dark"]` — uma regra, sem variante
  por componente.
- A cor de cada sala é calculada em runtime por `corDaSala()`
  (`src/lib/cores.ts`, hash do nome do aluno sobre as quatro cores do símbolo)
  e injetada por elemento como `--sala`, com fallback
  `var(--sala, var(--accent))`. Utilitário de classe não expressa valor
  calculado por dado.
- As classes são semânticas do domínio (`.aluno`, `.trilho`, `.ficha`,
  `.retrato`, `.linha-adm`), então o markup lê como o problema.

O custo seria uma toolchain a mais (PostCSS, config, safelist para classes
dinâmicas) num app de quatro dependências e um único arquivo de estilos. Não
há `tailwind.config.*` nem `postcss.config.*` no repositório.

## Invariante dos módulos puros

`src/lib/busca.ts`, `cores.ts`, `importar.ts`, `links.ts`, `ranking.ts` e
`slug.ts` **não importam nada** — nem uns aos outros, nem `@/lib/*`. Isso é
exigência do runner de teste: `node --experimental-strip-types` não resolve
import sem extensão, e o teste importa esses arquivos direto
(`import { fold } from "../src/lib/busca.ts"`). Se um deles precisar de outro,
o caminho é duplicar a regra pequena ou mover a dependência para quem chama —
não criar o import. Os módulos que dependem de ambiente (`dados.ts`, `sessao.ts`,
`tipos.ts`, `supabase/*`) ficam fora desse conjunto e não são testados direto.
