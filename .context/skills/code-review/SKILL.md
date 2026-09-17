---
type: skill
name: Code Review
description: Revisar mudanças no alunos-sesi cobrando os contratos do repositório (src/lib/ folha, regex espelhando o SQL, exigirAdm() em toda Server Action, fronteira cliente/servidor). Use quando for revisar um diff ou um commit antes de fechar, checar aderência aos padrões do projeto, ou caçar bug e risco de segurança em código novo.
skillSlug: code-review
phases: [R, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Veja o tamanho: `git diff --stat origin/main...HEAD`. Diff grande demais para uma leitura só → peça a quebra antes de comentar linha.
2. Rode o que o CI roda: `npm run typecheck && npm test && npm run build`.
3. Leia por camada, nesta ordem: `src/sql/001_schema.sql` → `src/lib/` → `src/app/` → `src/components/` → `src/app/globals.css`.
4. Confira os contratos abaixo — são eles que quebram neste repo, não estilo genérico.
5. Separe o que bloqueia do que é sugestão, com o porquê em cada uma.
6. Comente o que está certo quando o padrão foi seguido: comentário de "por quê" no lugar certo, teste junto do fix, acessibilidade preservada.

## Contratos que a revisão cobra

**1. `src/lib/` puro continua puro.** `busca.ts`, `importar.ts`, `links.ts`, `ranking.ts`, `slug.ts` e `cores.ts` são módulos folha: zero imports, de propósito, porque `tests/puros.test.mjs` os carrega direto pelo `node --experimental-strip-types --test`. Um `import` novo em qualquer um deles quebra `npm test`. Módulo que fala com banco (`dados.ts`) ou com `node:crypto` (`sessao.ts`) fica fora dos testes, não dentro.

**2. Os regex espelham o banco.** `RE_GITHUB` e `RE_LINKEDIN_HANDLE` em `src/lib/links.ts` são o mesmo padrão das constraints `github_handle` e `linkedin_url` em `src/sql/001_schema.sql`; `slugificar` corta em 60 caracteres para caber na CHECK `^[a-z0-9-]{2,80}$` de `public.alunos`; `parseLista` recusa nome com menos de 2 letras, igual à CHECK de `alunos.nome`. Mudar um lado sem o outro só aparece como erro de insert em produção.

**3. Server Action começa por `exigirAdm()`.** Toda `export async function` de `src/app/adm/acoes.ts` precisa da guarda na primeira linha, porque o proxy não cobre o POST da ação. Toda mutação precisa terminar em `revalidar()` (`revalidatePath` de `/alunos` e `/adm`).

**4. Fronteira cliente/servidor.** `@/lib/supabase/admin` (service_role) e `@/lib/sessao` (`node:crypto`) só podem ser importados de código de servidor. Se o diff puser um deles em arquivo com a diretiva `"use client"` — hoje `Vitrine.tsx`, `CartaoAluno.tsx`, `TemaToggle.tsx`, `adm/ImportarLista.tsx` e `adm/FormAluno.tsx` — é bloqueio, não sugestão. Cuidado ao grepar: a string aparece também dentro de comentário, como no docblock de `src/lib/supabase/admin.ts`.

**5. Arquivo `"use server"` só exporta função async.** Tipo e constante vão para `src/app/adm/estado.ts`; isso não é duplicação a ser unificada.

**6. Falha de leitura não é lista vazia.** Página que lê do Supabase segue o padrão de `src/app/alunos/page.tsx`: `try/catch` com `console.error` e um `<Vazio>` dizendo que o banco não respondeu. Devolver grade vazia no erro faz alguém recadastrar a turma inteira.

**7. CSS é token, não valor.** Sem Tailwind: cor e espaçamento saem de `src/app/globals.css` (`var(--dim)`, `var(--faint)`, `var(--line)`, `var(--surface)`), e a cor da sala entra por `style={{ ["--sala"]: corDaSala(nome) }}` — nunca hex solto no `.tsx`. Classe renomeada no TSX sem mexer no CSS (ou o contrário) é achado de revisão: não há verificação automática ligando os dois.

**8. Ordenação determinística.** Lista nova ordenada passa por `ordenarAlunos`/`rankingSalas` (`src/lib/ranking.ts`) ou replica o desempate por nome e id. `sort` instável faz a lista pular entre dois renders, na frente de quem está olhando.

**9. Acessibilidade mínima.** Botão de estado leva `aria-pressed`, mensagem de retorno leva `role="status"`, ícone decorativo leva `aria-hidden`, campo sem label visível leva `sr-only`.

**10. Sem lint.** O projeto não tem ESLint de propósito, então o CI não pega `any` solto, import não usado, `useEffect` sem dependência nem promessa não aguardada: `tsc --noEmit` com `strict: true` é o teto automático. Quem revisa é a única rede — olhe essas coisas de propósito.

## Exemplos de comentário

```
src/app/adm/acoes.ts — a ação nova não chama exigirAdm().
O matcher de src/proxy.ts não cobre o POST da Server Action, então isso
deixa qualquer visitante remover aluno pelo painel. Adicionar a guarda
na primeira linha, como as outras quatro ações do arquivo.
```

```
src/lib/importar.ts — a normalização de sala não pode importar `fold`
de src/lib/busca.ts. O módulo é folha para o node --test carregar
direto; o import quebra `npm test` com ERR_MODULE_NOT_FOUND. Se a
normalização precisa ser compartilhada, ela desce para o próprio
importar.ts ou vira um terceiro módulo folha.
```

## O que o CI não cobre (verifique na mão)

- RLS: `./scripts/db-query.sh --psql "select * from pg_policies where schemaname = 'public';"` — leitura em `salas` e `alunos`, nada em `votos`.
- SQL novo: `./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql` (roda em `BEGIN`/`ROLLBACK`, não deixa rastro).
- Caminho do ADM: `/adm/<chave>` → 303 para `/adm` com cookie `sesi.adm`; chave errada → 404.
- Voto: POST e DELETE em `/api/estrela` mexendo em `estrelas` uma vez por navegador.

## Quality Bar

- Comente o porquê com o caminho do arquivo e o comportamento observável; nada de "considere refatorar".
- Bloqueio: `service_role` alcançável do cliente, ação sem `exigirAdm()`, módulo folha ganhando import, regex divergindo da CHECK do SQL, mutação sem `revalidar()`.
- Sugestão: nome, extração de função, ordem de imports, texto de mensagem.
- Não reescreva o diff inteiro: aponte o menor caminho que resolve.
- Rode os comandos e cole o output; sem output, escreva "não executado".

## Resource Strategy

- `scripts/`: só se a revisão repetir uma checagem (ex.: um script que compara `RE_GITHUB` com a constraint `github_handle` do banco).
- `references/`: só para um checklist longo de RLS que não caiba aqui.
- `assets/`: nada — esta skill produz comentário, não arquivo.
