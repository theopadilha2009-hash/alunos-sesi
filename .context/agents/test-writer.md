---
type: agent
name: Test Writer
description: Write comprehensive unit and integration tests
agentType: test-writer
phases: [E, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Test Writer — alunos-sesi

A suíte deste projeto tem **um arquivo**: `tests/puros.test.mjs`, rodando com
`node:test` (runner nativo), **sem rede**. O escopo é deliberado: só funções
puras de `src/lib/`. O `README.md` diz isso com todas as letras — "os testes
cobrem só as funções puras (`src/lib/`), que por isso não têm imports cruzados".

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [test-generation](./../skills/test-generation/SKILL.md) | Generate comprehensive test cases for code. Use when Writing new functionality, Adding tests for bug fixes (regression tests), or Improving test coverage for existing code |

## Responsabilidades

- Cobrir as funções puras de `src/lib/` com casos de borda reais do domínio
  (nome com acento, sala "3ºA", colagem de planilha, empate de estrelas).
- Escrever o teste **que reproduz** um bug antes de corrigi-lo.
- Manter a suíte rápida e sem dependência externa: nenhuma chamada ao Supabase,
  nenhum `fetch`, nenhum `jsdom`.

## Regras duras (quebrar qualquer uma quebra a suíte)

1. **O módulo sob teste não pode ganhar import.** `busca.ts`, `links.ts`,
   `slug.ts`, `ranking.ts`, `importar.ts` e `cores.ts` são carregados direto pelo
   Node com `--experimental-strip-types`, que **não resolve import relativo sem
   extensão**. Se a função precisa de outro módulo, ela não é testável aqui.
2. **Importe com a extensão explícita:** `from "../src/lib/busca.ts"` — como já
   faz o arquivo atual.
3. **Nome do arquivo tem que casar com o glob do `npm test`:** o script é
   `node --experimental-strip-types --test tests/*.test.mjs`. Um arquivo fora de
   `tests/` ou sem o sufixo `.test.mjs` **não roda** no `npm test` (e portanto
   não roda no CI).
4. **Sem rede e sem variável de ambiente.** Nada de `process.env` no teste.
5. **`node:test` + `node:assert/strict`**, no formato `test("...", () => { assert... })`.

## Convenções do arquivo

- Títulos de teste e mensagens de `assert` em **português sem acento**
  (`"fold ignora acento e caixa"`, `"query vazia nao filtra nada"`). É a
  convenção de `tests/puros.test.mjs` — siga.
- Seções separadas por comentário de barra (`// ── busca ───...`), na ordem:
  busca, links, slug, importar, ranking.
- Mensagem de assert quando a falha não é óbvia: `assert.equal(r.erros[0].linha, 2, "o erro aponta a linha do texto colado")`.
- Prefira `assert.deepEqual` para listas de nomes/ids e `assert.equal` para
  escalares.

## O que já está coberto

`tests/puros.test.mjs` cobre: `fold` (acento, caixa, `º`/`ª`), `matches`,
`filtrarAlunos` (sala, atalho `ESTRELADOS`), `normalizarGithub`,
`normalizarLinkedin`, `urlGithub`, `handleLinkedin`, `iniciais`, `slugificar`,
`slugUnico`, `detectarSeparador`, `parseLista` (cabeçalho, cabeçalho fora de
ordem, sem cabeçalho, erros por linha, nome de 2 letras, duplicata, linha em
branco, texto vazio), `ordenarAlunos` (fixado/destaque/estrelas, empate estável,
não muta a entrada) e `rankingSalas`.

## Lacunas reais (bons candidatos a teste)

| Alvo | Caso que falta |
|---|---|
| `src/lib/cores.ts` — `corDaSala` | **nenhum teste hoje** (o módulo nem é importado pela suíte). Cobrir: devolve sempre um item de `CORES_SALA`, é estável para o mesmo nome, e não quebra com string vazia |
| `src/lib/busca.ts` — `fold` | `ª` (o teste atual cobre `º`), e a regra `/(\d)[oa](?=[a-z])/` isolada ("3oa" já é coberto; falta "1oa" e um caso em que o "o" não deve sumir, ex.: "joao") |
| `src/lib/busca.ts` — `filtrarAlunos` | combinação de **sala + query** na mesma chamada (hoje cada teste usa um eixo só) |
| `src/lib/importar.ts` — `parseLista` | separador `;`, e cabeçalho com só uma das colunas obrigatórias (`tinhaCabecalho` deve ser `false`) |
| `src/lib/importar.ts` — `detectarSeparador` | empate (ex.: uma vírgula e uma tabulação na mesma linha) e `;` |
| `src/lib/links.ts` — `normalizarLinkedin` | handle com `%` e `_` (o regex `RE_LINKEDIN_HANDLE` aceita) |
| `src/lib/slug.ts` — `slugUnico` | o fallback final (quando todos os sufixos de 2 a 4999 estão tomados) — difícil de exercitar, avalie se vale |
| `src/lib/ranking.ts` — `rankingSalas` | empate completo (mesmo `estrelas`, `completude` e `alunos`) caindo no nome |

## O que **não** testar aqui

- Componentes React: não há `jsdom`, `@testing-library/*` nem `vitest` em
  `package.json`, e o CI não instala nada disso. Teste de UI neste projeto é
  inspeção no `npm run dev`.
- Server Actions, rotas e Supabase: dependem de rede, de cookie e de banco. O
  CI diz explicitamente que "o que precisa de banco é verificado na mão, contra
  o projeto de verdade".
- `src/lib/dados.ts`, `src/lib/sessao.ts`, `src/lib/supabase/*`: usam
  `process.env` e `node:crypto`/rede. Ficam fora.

## Fluxo de trabalho

1. Identifique a função pura e o caso de borda real (não um caso genérico).
2. Escreva o teste no bloco temático correspondente de `tests/puros.test.mjs`.
3. Rode só o arquivo enquanto itera:
   `node --experimental-strip-types --test tests/puros.test.mjs`.
4. Se o teste falha e o código está errado, o teste fica; corrija o código.
5. Rode a suíte completa e o CI local antes de fechar.

## Checks de qualidade

```bash
node --experimental-strip-types --test tests/puros.test.mjs
npm test
npm run typecheck
npm run build
```

- `npm test` tem que mostrar a contagem nova de testes passando, sem nenhum
  `skipped` e sem `todo`.
- Nenhum teste pode depender de ordem de execução nem de estado compartilhado
  entre casos (cada `test()` monta seus próprios dados).
- Cole a saída real no relatório. Sem execução, escreva "não executado" e o
  comando que falta.
