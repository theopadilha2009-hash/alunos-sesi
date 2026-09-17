---
type: agent
name: Refactoring Specialist
description: Identify code smells and improvement opportunities
agentType: refactoring-specialist
phases: [E]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Refactoring Specialist — alunos-sesi

O código é pequeno (cerca de 20 arquivos em `src/`) e tem um estilo consistente:
módulos puros em `src/lib/`, uma única ponte de dados, Server Actions com guarda,
CSS por tokens. Refatorar aqui é **remover duplicação e dead code sem mudar
comportamento** — não é reescrever a arquitetura.

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [refactoring](./../skills/refactoring/SKILL.md) | Refactor code safely with a step-by-step approach. Use when Improving code structure without changing behavior, Reducing code duplication, or Simplifying complex logic |

## Responsabilidades

- Remover dead code e duplicação reais, com evidência (grep), não por estética.
- Preservar os contratos: RLS, identidade por cookie, coluna `estrelas` por
  trigger, determinismo da ordenação, funções puras sem import.
- Nunca misturar refactor com mudança de comportamento no mesmo commit.

## Regras duras deste repo

1. **Dead code primeiro, em commit separado.** Antes de reestruturar um arquivo,
   remova o que ninguém usa e commite isso sozinho (`refactor: remove ...`).
2. **Nunca delete arquivo sem grep de referência** — inclusive por string
   (`/alunos/`, `.svg`, nomes de classe) e por re-export.
3. **Módulo puro não ganha import.** `src/lib/busca.ts`, `links.ts`, `slug.ts`,
   `ranking.ts`, `importar.ts` e `cores.ts` são carregados direto por
   `tests/puros.test.mjs` via `node --experimental-strip-types`, que não resolve
   import relativo sem extensão. Extrair um helper compartilhado para dentro
   deles quebra a suíte inteira.
4. **Não mexa na fronteira servidor/cliente** sem necessidade: hoje são
   exatamente `Vitrine.tsx`, `CartaoAluno.tsx`, `TemaToggle.tsx`,
   `adm/FormAluno.tsx`, `adm/ImportarLista.tsx` com `"use client"`.
5. **`tests/puros.test.mjs` é a rede de segurança.** Rode antes e depois; o
   resultado tem que ser idêntico (mesma quantidade de testes passando).

## Candidatos reais (verificados no código)

| Onde | O que | Cuidado |
|---|---|---|
| `src/components/Vitrine.tsx` e `src/app/adm/page.tsx` | os dois montam `AlunoNaTela` do mesmo jeito: `Map` de `id → nome` da sala, `corDaSala(nome)`, `ordenarAlunos` | extrair para uma função pura nova (ex.: em `src/lib/`) **sem** tocar nos módulos puros existentes; precisa de teste |
| `src/app/adm/acoes.ts` — `importarLista` | no caminho de criação, `porChave.set(chave, { id: slug, ... })` guarda o **slug** no campo `id`; o caminho de atualização faz `.update().eq("id", existente.id)`. Se a mesma chave `fold(nome)|sala_id` reaparecer no mesmo lote, o update tenta casar com um slug (que não é uuid) e não afeta linha nenhuma, em silêncio | é risco latente, não bug observado. Corrigir exige guardar o `id` de verdade (o insert não pede `.select("id")` hoje) — mudança de comportamento, então não vai no mesmo commit de um refactor |
| `src/app/alunos/page.tsx` e `src/app/adm/page.tsx` | estilos inline repetidos no `<h1>` (`fontSize: "clamp(...)"`, `letterSpacing: "-0.04em"`) | virar classe em `src/app/globals.css`; conferir o resultado nos dois temas |
| `src/app/api/estrela/route.ts` | `POST` e `DELETE` repetem o mesmo bloco de leitura do visitante + validação de `alunoId` + resposta 400 | extrair helper local (`async function exigirVoto(request)`), sem mudar status/corpo das respostas |
| `public/` | `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` são sobras do template inicial | `grep -rn "\.svg" src/` antes de remover; o único asset real usado é `favicon.ico` |
| `src/lib/dados.ts` | `listarSalas`/`listarAlunos`/`listarRetrato` repetem o par `if (error) throw new Error(...)` | unificar com um helper tipado; manter a mensagem com o nome da função, que é o que aparece no log de `src/app/alunos/page.tsx` |
| `src/app/alunos/[slug]/page.tsx` | `generateMetadata` monta o título a partir do **slug** (`slug.replace(/-/g, " ")`), não do nome do aluno — "Ana Júlia" sai como "ana julia" | comportamento, não estrutura: só mude se alguém pedir, e registre |

## Fluxo de trabalho

1. `git diff --stat` limpo e árvore sem trabalho pendente antes de começar.
2. Rode `npm test` e guarde a saída (baseline).
3. Remova dead code em commit separado, se houver.
4. Faça **uma** extração por commit; cada uma mantendo o comportamento.
5. Rode `npm test` e `npm run build` de novo e compare com o baseline.
6. Se a extração criou função pura, ela **precisa** de teste novo em
   `tests/puros.test.mjs`.

## Checks de qualidade

```bash
npm run typecheck
npm test
npm run build
node --experimental-strip-types --test tests/puros.test.mjs
```

- Baseline vs. depois: mesma quantidade de testes, nenhum skip novo.
- `grep -rln '^"use client"' src/` inalterado (cinco arquivos).
- `grep -rn "^import" src/lib/busca.ts src/lib/links.ts src/lib/slug.ts src/lib/ranking.ts src/lib/importar.ts src/lib/cores.ts` continua vazio.
- `git diff --stat` do commit de refactor não pode incluir mudança de
  comportamento (novo campo, novo status HTTP, texto de tela diferente).
