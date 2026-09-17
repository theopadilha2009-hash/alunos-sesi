---
type: skill
name: Test Generation
description: Escrever testes para o alunos-sesi com node:test sobre as funções puras de src/lib/, sem rede e sem banco. Use quando for adicionar cobertura, escrever o teste que falha antes do fix, ou travar em teste um limite que também existe no SQL.
skillSlug: test-generation
phases: [E, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Escolha o alvo: só função pura de `src/lib/` — `busca.ts` (`fold`, `matches`, `filtrarAlunos`, `TODAS`, `ESTRELADOS`), `importar.ts` (`parseLista`, `detectarSeparador`), `links.ts` (`normalizarGithub`, `normalizarLinkedin`, `urlGithub`, `handleLinkedin`, `iniciais`), `ranking.ts` (`ordenarAlunos`, `rankingSalas`), `slug.ts` (`slugificar`, `slugUnico`), `cores.ts` (`corDaSala`).
2. Escreva o caso que falha primeiro, rode, veja falhar, e só então corrija o código.
3. Cubra o caminho feliz, a borda (vazio, null, limite exato) e o caso que o banco recusaria.
4. Rode `npm test` e confirme a contagem (`# pass` maior que antes, `# fail 0`).
5. Se o teste exige import novo em módulo folha, o desenho está errado: pare e reveja a camada.

## Como o harness funciona aqui

```bash
npm test                                                            # tudo
node --experimental-strip-types --test tests/puros.test.mjs         # só o arquivo
node --experimental-strip-types --test --test-name-pattern="slug" tests/puros.test.mjs
```

- O script é `node --experimental-strip-types --test tests/*.test.mjs`, então qualquer arquivo `tests/*.test.mjs` entra. O padrão do repo é concentrar tudo em `tests/puros.test.mjs`, em seções separadas por comentário (`// ── busca ──`, `// ── links ──`, `// ── slug ──`, `// ── importar ──`, `// ── ranking ──`).
- Import com caminho relativo e extensão explícita: `import { slugificar } from "../src/lib/slug.ts";`. O type stripping não resolve `@/` nem import sem extensão — é exatamente por isso que os módulos testados não têm import nenhum.
- Node 22 no CI (`node-version: 22` em `.github/workflows/ci.yml`), sem dependência de teste no `package.json`: `node:test` e `node:assert/strict` são o harness inteiro.
- Zero rede, zero Supabase, zero `.env`. Se o teste precisa de `ADM_CHAVE`, de banco ou de `fetch`, ele está na camada errada.

## Estilo do arquivo

```javascript
import assert from "node:assert/strict";
import { test } from "node:test";
import { slugUnico, slugificar } from "../src/lib/slug.ts";

test("slug nunca colide e nunca sai vazio", () => {
  assert.equal(slugUnico("Ana Silva", []), "ana-silva");
  assert.equal(slugUnico("Ana Silva", ["ana-silva"]), "ana-silva-2");
  assert.equal(slugificar("!!!"), "aluno");
});
```

- `test("...", () => {})` direto, sem `describe`/`it` — é o estilo que já está no arquivo.
- Título curto, em português, dizendo o comportamento ("duplicata na mesma colagem e contada e nao duplica"), sem acento, seguindo o arquivo existente.
- Terceiro argumento de `assert` carrega a explicação quando a falha não é óbvia: `assert.equal(r.linhas[0].linha, 2, "numero da linha e o do texto colado")`.
- Dado de teste é objeto literal montado no próprio teste; nada de fixture em arquivo separado, nada de `beforeEach`.

## Limites que o teste deve espelhar

Estes números existem no banco (`src/sql/001_schema.sql`) e precisam existir no teste, senão o código passa no teste e falha no insert:

| Limite | Onde está no SQL |
|---|---|
| nome com 2 a 120 caracteres | CHECK de `public.alunos.nome` |
| slug casando `^[a-z0-9-]{2,80}$` | CHECK de `public.alunos.slug` |
| handle de GitHub com até 39 caracteres, sem hífen nas pontas | constraint `github_handle` |
| handle de LinkedIn com até 100 caracteres | constraint `linkedin_url` |
| bio com até 280 caracteres | CHECK de `public.alunos.bio` |
| `visitante_id` como 32 hexadecimais | CHECK de `public.votos.visitante_id` |

Teste de limite usa a borda exata (2 e 120 passam, 121 não; 39 passa, 40 não), não um número qualquer.

## O que não testar aqui

- Componente React: não há jsdom, Testing Library nem runner de DOM no projeto. Componente se confere rodando a tela.
- `src/lib/dados.ts`, `src/lib/sessao.ts` e `src/lib/supabase/*`: dependem de rede, de `node:crypto` ou de variável de ambiente.
- Página, Server Action e Route Handler: a verificação é o caminho no navegador (`/alunos`, `/alunos/<slug>`, `/adm`), mais `npm run build`.
- Biblioteca de terceiro (`@supabase/supabase-js`) e o comportamento do próprio Next.
- Nada que dependa de `Date.now()`, `Math.random()` ou de ordem de hash de objeto: teste que varia entre execuções não serve.

## Quality Bar

- Teste descreve comportamento observável, não a implementação interna.
- Cada teste monta o próprio dado e não depende do que outro teste fez.
- Falha primeiro, passa depois — o teste de regressão vem antes do fix.
- `npm test` fecha com `# fail 0` e você cola a saída.
- Cobertura nova acompanha código novo: função pura adicionada em `src/lib/` entra no `tests/puros.test.mjs` no mesmo commit.
- `corDaSala` em `src/lib/cores.ts` é pura e ainda não tem teste — bom primeiro alvo de cobertura.

## Resource Strategy

- `scripts/`: nada — `npm test` é o comando.
- `references/`: nada.
- `assets/`: nada.
