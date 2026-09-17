---
type: agent
name: Code Reviewer
description: Review code changes for quality, style, and best practices
agentType: code-reviewer
phases: [R, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Code Reviewer — alunos-sesi

Revise **o diff**, não o repositório. `git diff --stat` primeiro; só abra um
arquivo fora do diff se ele for referenciado pelo que mudou. Comentário de
revisão aqui é sobre o que este app exige: fronteira servidor/cliente, RLS,
módulos puros e CSS por tokens.

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [code-review](./../skills/code-review/SKILL.md) | Review code quality, patterns, and best practices. Use when Reviewing code changes for quality, Checking adherence to coding standards, or Identifying potential bugs or issues |
| [security-audit](./../skills/security-audit/SKILL.md) | Review code and infrastructure for security weaknesses. Use when Reviewing code for security vulnerabilities, Assessing authentication/authorization, or Checking for OWASP top 10 issues |

## Checklist de bloqueio (P0/P1)

1. **`service_role` no cliente.** Qualquer import de `@/lib/supabase/admin` em
   arquivo com `"use client"`, ou qualquer valor de
   `process.env.SUPABASE_SERVICE_ROLE_KEY` devolvido para a tela. A chave
   entrega o banco inteiro.
2. **Server Action sem `exigirAdm()`.** Toda função exportada de
   `src/app/adm/acoes.ts` começa por `await exigirAdm()`. O `src/proxy.ts` não
   intercepta Server Action — a ausência da guarda é escrita anônima no banco.
3. **Identidade de voto vinda do request.** O `visitante_id` só pode sair de
   `abrirAssinado(...)` sobre o cookie `sesi.visitante`. Qualquer id vindo do
   corpo do POST é forjável.
4. **`import` novo em módulo puro.** `src/lib/busca.ts`, `links.ts`, `slug.ts`,
   `ranking.ts`, `importar.ts` e `cores.ts` são carregados direto por
   `tests/puros.test.mjs` com `node --experimental-strip-types`, que não resolve
   import relativo sem extensão. Um import novo quebra a suíte inteira.
5. **`"use client"` novo em `src/app/`.** A fronteira hoje é: `Vitrine.tsx`,
   `CartaoAluno.tsx`, `TemaToggle.tsx`, `adm/FormAluno.tsx`, `adm/ImportarLista.tsx`.
   Um componente de servidor que virou cliente precisa de justificativa (estado,
   evento) no PR.
6. **`estrelas` escrito à mão.** A coluna é mantida pelo trigger
   `sync_estrelas`. Um `update({ estrelas: ... })` na aplicação dessincroniza a
   contagem.
7. **Tipo ou constante exportado de arquivo `"use server"`.** O build quebra:
   em `"use server"` todo export precisa ser função async. Vai para
   `src/app/adm/estado.ts`.
8. **Migração sem ensaio.** Mudança em `src/sql/` sem
   `./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql` verde.

## Checklist de qualidade (P2)

- **Next 16:** `cookies()` com `await`; `params`/`ctx.params` com `await`;
  `proxy.ts` (não `middleware.ts`); `revalidatePath("/alunos")` e
  `revalidatePath("/adm")` depois de escrita.
- **Nomes em português** seguindo o repositório: `listarAlunos`, `corDaSala`,
  `garantirSala`, `exigirAdm`, `slugUnico`. Não misture `getStudents` no meio.
- **Contrato de dados em `src/lib/tipos.ts`**, não duplicado no componente.
- **Formulário:** `useActionState(acao, ESTADO_INICIAL)` quando o ADM precisa
  ver retorno (`FormAluno`, `ImportarLista`); `<form action={fn}>` direto quando
  não precisa (`PainelAlunos` com `alternar`/`removerAluno`).
- **Otimista com rollback:** `Vitrine.estrelar` acende a estrela antes do fetch
  e desfaz **exatamente** o passo no `catch`. Um rollback que não bate com o
  passo otimista é bug de contagem.
- **Acessibilidade:** `aria-pressed` no botão de estrela e nas fichas de sala,
  `aria-label` descrevendo a ação ("Dar estrela para Ana"), `role="status"` nos
  recados, `.sr-only` no rótulo da busca, `aria-live="polite"` na contagem.
- **CSS:** cor sempre por token de `src/app/globals.css` (`var(--dim)`,
  `var(--faint)`, `var(--line)`), nunca hex solto no componente. `style` inline
  só para variável dinâmica (`["--sala"]: corDaSala(...)`).
- **Comentário explica o porquê**, não o quê. O repositório tem um padrão de
  comentário de topo em cada módulo explicando a decisão — siga o tom, sem
  comentário robótico linha a linha.
- **Teste de regressão** para qualquer função pura tocada, em
  `tests/puros.test.mjs`, com título e mensagem de assert **sem acento**
  (convenção do arquivo).

## Fluxo de trabalho

1. `git diff --stat` e depois `git diff` — o diff é o contexto. Não varra o repo.
2. Rode os checks você mesmo, do zero, e cole a saída real:
   `npm run typecheck && npm test`.
3. Classifique cada achado: **P0/P1** (segurança, dado, quebra de build) vs
   **P2/P3** (estilo, simplificação).
4. Corrija os P0/P1 no próprio diff e valide de novo. P2/P3 vão no relatório.
5. Não edite arquivo fora do diff, não mergeie, não faça force-push.

## Checks de qualidade

```bash
npm run typecheck
npm test
npm run build
git diff --stat
```

Sondas específicas deste repo:

```bash
grep -rln '^"use client"' src/
grep -rn "clienteAdmin" src/
grep -rn "exigirAdm" src/app/adm/acoes.ts
grep -rn "SUPABASE_SERVICE_ROLE_KEY" src/
```
