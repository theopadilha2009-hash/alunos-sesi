---
type: skill
name: Commit Message
description: Escrever a mensagem de commit do alunos-sesi em Conventional Commits, com o escopo real do repositório, branch feat|fix|docs/<nome> e stage por caminho explícito. Use quando for commitar mudança, decidir o tipo e o escopo do commit, ou fechar um trabalho com o commit final.
skillSlug: commit-message
phases: [E, C]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. `git status --short` e `git diff --staged` — leia o que entra de verdade, não o que você lembra de ter escrito.
2. Confirme a branch: `git branch --show-current`. Se for `main`, crie a branch antes de qualquer commit (`git switch -c fix/slug-duplicado`).
3. Stage por caminho explícito: `git add src/lib/slug.ts tests/puros.test.mjs`. Nunca `git add -A` nem `git add .`.
4. Rode o que o CI vai rodar: `npm run typecheck && npm test && npm run build`.
5. Escreva a mensagem: tipo, escopo, assunto no imperativo, corpo explicando o porquê.
6. Feche com a linha de coautoria, exatamente como está abaixo.

## Formato

```
<type>(<escopo>): <assunto no imperativo, até 72 colunas>

<corpo: por que a mudança existe e o que muda de comportamento>

Co-Authored-By: [CC] <noreply@anthropic.com>
```

## Tipos e escopos deste repositório

| Tipo | Quando |
|---|---|
| `feat` | rota, ação do painel, campo, filtro ou função nova |
| `fix` | comportamento errado corrigido |
| `refactor` | mesma saída, estrutura diferente |
| `test` | só `tests/puros.test.mjs` |
| `docs` | `README.md`, `.context/`, docblock de módulo |
| `chore` | dependência, script do `package.json`, `.github/workflows/ci.yml` |
| `perf` | ganho medido em render ou em consulta |

Escopos reais: `vitrine` (`src/app/alunos/`, `src/components/Vitrine.tsx`, `src/components/CartaoAluno.tsx`), `adm` (`src/app/adm/`, `src/components/adm/`), `api` (`src/app/api/estrela/route.ts`), `lib` (`src/lib/`), `sql` (`src/sql/001_schema.sql`), `proxy` (`src/proxy.ts`), `ci` (`.github/workflows/ci.yml`), `context` (`.context/`).

## Exemplos

```
feat(adm): importa a lista da turma por colagem

O parser aceita tab, vírgula e ponto e vírgula, com ou sem cabeçalho, e
a prévia roda no navegador antes de aplicar. A importação nunca
sobrescreve link já cadastrado.
```

```
fix(lib): aceita handle de GitHub com hífen no meio

O regex estava mais apertado que a constraint github_handle do banco e
recusava handle válido no cadastro.
```

```
test(lib): cobre o desempate do ranking por nome

O sort dependia da ordem de entrada; o teste garante que dois renders
seguidos dão a mesma lista.
```

```
chore(ci): roda o build com env de mentira

O build só precisa que as variáveis existam para as rotas de servidor
não explodirem na coleta; nada aqui conecta no Supabase.
```

## Regras

- Nunca commite direto na `main`. O CI roda em push para `main` e em pull request, e a branch de trabalho é `feat|fix|docs/<nome>`.
- Um assunto por commit. Schema, função pura e UI em commits separados quando der — o histórico fica legível e o revert fica cirúrgico.
- Assunto e corpo em português, imperativo, sem ponto final no assunto. Descreva o porquê; o diff já mostra o quê.
- Stage por caminho explícito. `git add -A` varre arquivo de outra tarefa, trabalho pela metade e edição de outra sessão no mesmo clone.
- `.env.local` nunca entra: o `.gitignore` cobre `.env*` e libera só o `.env.example`, que carrega apenas os nomes das chaves. Se uma chave vazar, rotacione `ADM_CHAVE` e as chaves do Supabase antes de qualquer outra coisa — trocar `ADM_CHAVE` invalida crachás do ADM e cookies de voto.
- `AGENTS.md` é reescrito pelo `next dev`: commite junto com o seu trabalho em vez de reverter a mudança.
- Nunca faça `push` para `main` nem `--force` sem autorização explícita.
- A linha `Co-Authored-By: [CC] <noreply@anthropic.com>` fecha toda mensagem de commit e não é opcional.

## Quality Bar

- Assunto cabe em 72 colunas e não termina em ponto.
- Corpo existe quando a mudança tem causa não óbvia (constraint do banco, comportamento do Next 16, limite de RLS).
- `git diff --staged` revisado antes do commit; nada de arquivo que você não pretendia incluir.
- Typecheck, testes e build rodados com o output colado — ou "não executado: <razão>".

## Resource Strategy

- `scripts/`: nada — o fluxo usa `git` e os scripts do `package.json` direto.
- `references/`: nada.
- `assets/`: nada.
