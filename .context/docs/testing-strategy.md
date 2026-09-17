---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Estratégia de testes

## O que é testado

Só as funções puras de `src/lib/`. Um arquivo, `tests/puros.test.mjs`, com 27
testes em `node:test` + `node:assert/strict`, sem rede e sem banco:

| Módulo | O que os testes travam |
|---|---|
| `src/lib/busca.ts` | `fold` ignora acento e caixa; `3ºA`/`3oA`/`3A` caem na mesma busca; `matches` acha por nome, sala e handle; `filtrarAlunos` não vaza outra sala e o atalho `ESTRELADOS` ignora o filtro de sala |
| `src/lib/links.ts` | `normalizarGithub` aceita URL, `github.com/x`, `@handle` e handle solto, e recusa o que não é handle (hífen nas pontas, espaço, 40 chars); `normalizarLinkedin` sempre sai como `https://www.linkedin.com/in/<handle>` e recusa perfil de empresa; `urlGithub`, `handleLinkedin` e `iniciais` |
| `src/lib/slug.ts` | `slugificar` tira acento, espaço e caixa; `slugUnico` nunca colide (`ana-silva`, `ana-silva-2`, …) e nunca sai vazio (`"!!!"` → `aluno`); o slug cabe no limite da constraint do banco (`^[a-z0-9-]{2,80}$`, até 60 chars) |
| `src/lib/importar.ts` | `detectarSeparador` (tab, vírgula, ponto e vírgula) e `parseLista`: cabeçalho fora de ordem, ordem posicional sem cabeçalho, linha sem nome/sem sala/nome curto viram erro com o número da linha do texto colado, duplicata contada e descartada, linhas em branco não deslocam a contagem, texto vazio devolve resultado vazio |
| `src/lib/ranking.ts` | `ordenarAlunos`: fixado > destaque > estrelas, empate cai no nome, o desempate não depende da ordem de entrada e o array original não é mutado; `rankingSalas` desempata por completude |

Os testes cobrem os pontos onde o comportamento é sutil e barato de errar:
normalização de link colado, parser de planilha, desempate estável e `fold` do
`º` (U+00BA), que o NFD não decompõe e por isso precisa de tratamento explícito.

## Comando

```bash
npm test        # node --experimental-strip-types --test tests/*.test.mjs
npm run typecheck   # tsc --noEmit
npm run build
```

Não há runner instalado (nem Vitest, nem Jest): o teste usa o `node:test` que
já vem no Node 22 do CI. A flag `--experimental-strip-types` é o que permite
importar os `.ts` de `src/lib/` sem compilar.

## Por que as libs não têm imports cruzados

O type-stripping do Node não reescreve especificador de import: `import { fold }
from "@/lib/busca"` (ou `from "./busca"` sem extensão) não resolve, e
`from "./busca.ts"` resolveria mas seria inválido para o bundler. A saída
adotada foi manter os módulos puros como **folhas**: `busca.ts`, `cores.ts`,
`importar.ts`, `links.ts`, `ranking.ts` e `slug.ts` não importam nada.

A regra é estrutural, não estética. Está escrita no cabeçalho de cada um deles
("Sem imports de propósito: testado direto pelo `node --test`"), e o teste
importa literalmente `../src/lib/busca.ts`. Se um dia um desses módulos
precisar de outro, ou o runner muda (um bundler de teste) ou o módulo sai do
conjunto testável.

Já `src/lib/dados.ts`, `sessao.ts`, `tipos.ts` e `supabase/*` importam à
vontade — eles não são testados direto.

## O que NÃO é testado automaticamente

- **Server Actions** (`src/app/adm/acoes.ts`): `importarLista`, `criarAluno`,
  `removerAluno`, `alternar`. Dependem de `cookies()`, de `revalidatePath` e do
  cliente admin.
- **Route Handlers**: `/api/estrela` (POST/DELETE) e `/adm/[chave]` (GET).
- **`src/proxy.ts`** — a emissão do cookie do visitante.
- **Toda a leitura do Supabase** (`src/lib/dados.ts`) e a RLS de
  `src/sql/001_schema.sql`.
- **Componentes de React**, incluindo o voto otimista de `Vitrine.tsx`. Não há
  jsdom nem Testing Library instalados.

O CI não tem banco: `.github/workflows/ci.yml` sobe só Node, roda typecheck,
testes e build, este último com valores de mentira nas variáveis de ambiente
(o comentário no workflow diz que nada ali conecta).

## Como as partes sem teste são conferidas

À mão, contra o projeto Supabase de verdade, porque é onde a maior parte do
risco mora:

1. **Fluxo no browser**, com `npm run dev`: dar estrela e ver o número subir,
   clicar de novo para tirar, recarregar e conferir que o estado persistiu, e
   votar duas vezes no mesmo aluno para ver que o contador não anda duas vezes.
2. **Link secreto**: abrir `/adm/<ADM_CHAVE>` e confirmar que a URL vira `/adm`
   e que a chave sumiu da barra; abrir `/adm` numa janela limpa e confirmar
   **404**, não uma tela de login; abrir `/adm/<chave-errada>` e confirmar 404.
3. **Painel**: colar a lista da turma mesmo (a prévia roda no navegador antes
   de aplicar), conferir a contagem de novos/completados/ignorados, fixar e
   destacar um aluno e ver a mudança na vitrine, e reimportar a mesma lista
   para confirmar que nada é sobrescrito.
4. **Schema**: `./scripts/db-query.sh --check -f src/sql/001_schema.sql` para o
   lint offline e `--dry-run --force -f` para executar de verdade dentro de uma
   transação com `ROLLBACK`, que pega erro de sintaxe, FK e constraint que
   regex não pega.

Um schema errado não aparece em teste nenhum: a RLS de `votos` e a view
`retrato_salas` só se provam consultando o banco.

## Gates

| Gate | Onde | Bloqueia |
|---|---|---|
| `npm run typecheck` | CI e local | sim |
| `npm test` | CI e local | sim |
| `npm run build` | CI e local | sim |
| lint de SQL (`--check`) | antes de aplicar migration | sim (exit 2) |
| `--dry-run` do SQL | antes de aplicar migration | sim |

Não há meta de cobertura. A regra prática é: regra de negócio pura nova em
`src/lib/` entra com teste em `tests/puros.test.mjs`; o resto se confere no
browser e no banco.
