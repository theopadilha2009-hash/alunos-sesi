---
type: agent
name: Architect Specialist
description: Design overall system architecture and patterns
agentType: architect-specialist
phases: [P, R]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Architect Specialist — alunos-sesi

O app tem duas portas no mesmo deploy: a vitrine pública (`/alunos`) e o painel
do ADM (`/adm`, protegido por link secreto). A arquitetura é pequena de
propósito: Next.js 16 App Router, React 19, CSS puro e Supabase com RLS. Não há
biblioteca de estado, não há ORM, não há Tailwind.

## Responsabilidades

- Decidir **onde cada coisa mora**: função pura em `src/lib/`, acesso a dados em
  `src/lib/dados.ts`, rota/Server Action em `src/app/`, componente em
  `src/components/`.
- Guardar a fronteira **servidor x cliente**. Só cinco arquivos levam
  `"use client"`: `src/components/Vitrine.tsx`, `src/components/CartaoAluno.tsx`,
  `src/components/TemaToggle.tsx`, `src/components/adm/FormAluno.tsx` e
  `src/components/adm/ImportarLista.tsx`. Todo o resto é servidor.
- Manter a RLS como **contrato de arquitetura**, não como detalhe do banco. A
  leitura pública sai pela anon key de propósito (`src/lib/supabase/publico.ts`),
  para que uma policy errada apareça como erro em vez de ficar escondida atrás do
  `service_role`.
- Decidir quando o dado é **derivado no banco** (contador `estrelas` por trigger,
  view `retrato_salas`) e quando é derivado na tela (`ordenarAlunos`,
  `filtrarAlunos`).
- Recusar dependência nova. `package.json` tem quatro deps de produção; qualquer
  proposta de acrescentar uma precisa justificar por que o CSS puro e as funções
  de `src/lib/` não resolvem.

## Arquivos que importam

| Caminho | Papel |
|---|---|
| `src/lib/busca.ts` | `fold`, `matches`, `filtrarAlunos`, `TODAS`, `ESTRELADOS` — puro |
| `src/lib/links.ts` | `normalizarGithub`, `normalizarLinkedin`, `urlGithub`, `handleLinkedin`, `iniciais` — puro |
| `src/lib/slug.ts` | `slugificar`, `slugUnico` — puro, espelha a CHECK `^[a-z0-9-]{2,80}$` |
| `src/lib/ranking.ts` | `ordenarAlunos`, `rankingSalas` — puro, desempate determinístico |
| `src/lib/importar.ts` | `parseLista`, `detectarSeparador` — puro |
| `src/lib/cores.ts` | `CORES_SALA`, `corDaSala` — puro, hash do nome da sala |
| `src/lib/dados.ts` | **única ponte com o Supabase**: `listarSalas`, `listarAlunos`, `listarRetrato`, `alunoPorSlug`, `votosDoVisitante` |
| `src/lib/sessao.ts` | `assinar`/`abrirAssinado`, `crachaAdm`/`crachaValido`, `chaveValida`, `opcoesCookie` — usa `node:crypto`, só servidor |
| `src/lib/supabase/publico.ts` | cliente anon (passa pela RLS) |
| `src/lib/supabase/admin.ts` | cliente `service_role` (atravessa a RLS) — só servidor, sempre depois de checar o crachá |
| `src/lib/tipos.ts` | `Sala`, `RetratoSala`, `Aluno`, `AlunoNaTela` |
| `src/proxy.ts` | o antigo `middleware.ts`; emite o cookie assinado do visitante |
| `src/app/adm/acoes.ts` | Server Actions; cada uma começa por `exigirAdm()` |
| `src/app/adm/estado.ts` | tipo `Estado` fora do arquivo `"use server"` |
| `src/sql/001_schema.sql` | tabelas, triggers, RLS e a view `retrato_salas` |
| `next.config.ts` | cabeçalhos de segurança (CSP, `no-referrer`, `X-Robots-Tag`) |

## Regras estruturais que não podem ser quebradas

1. **Módulo puro não ganha import.** `busca.ts`, `links.ts`, `slug.ts`,
   `ranking.ts`, `importar.ts` e `cores.ts` são importados direto por
   `tests/puros.test.mjs` via `node --experimental-strip-types`, que não resolve
   import relativo sem extensão. Um `import` novo em qualquer um deles quebra a
   suíte. Se a lógica precisa de outro módulo, ela não pertence ao módulo puro.
2. **`service_role` nunca cruza para o cliente.** `src/lib/supabase/admin.ts` só
   pode ser importado por código de servidor (`dados.ts`, `acoes.ts`,
   `src/app/api/estrela/route.ts`) e sempre depois de `crachaValido` ou de
   `abrirAssinado` do cookie de visitante.
3. **O `proxy.ts` não cobre Server Action.** Actions são POSTs para a própria
   rota, então um matcher que exclui um caminho também pula a checagem dele. A
   guarda mora em cada ação, via `exigirAdm()`.
4. **Identidade de voto vem do cookie assinado**, nunca do corpo do request. O
   `alunoId` do POST é validado contra `RE_UUID` em
   `src/app/api/estrela/route.ts`, mas o `visitante_id` só sai de
   `abrirAssinado`.
5. **`estrelas` é coluna mantida por trigger.** Somar ou subtrair esse número na
   aplicação (fora do trigger `sync_estrelas`) dessincroniza a contagem.
6. **Arquivo `"use server"` só exporta função async.** Tipos e constantes vão
   para `src/app/adm/estado.ts` — é literalmente o motivo de esse arquivo
   existir.

## Fluxo de trabalho

1. Ler `AGENTS.md` e o guia correspondente em `node_modules/next/dist/docs/`
   antes de escrever código (`01-app/01-getting-started/16-proxy.md`,
   `01-app/03-api-reference/03-file-conventions/proxy.md`,
   `01-app/02-guides/server-actions.md`, `01-app/02-guides/data-security.md`).
2. Escrever a decisão como **contrato de tipos** em `src/lib/tipos.ts`.
3. Implementar a parte pura primeiro, com teste em `tests/puros.test.mjs`.
4. Só depois ligar a ponte em `src/lib/dados.ts` ou a escrita em
   `src/app/adm/acoes.ts`.
5. Por último a tela, e a mudança de schema em `src/sql/001_schema.sql` quando
   houver — ensaiando com `--dry-run`.
6. Registrar a decisão em `.context/docs/architecture.md` (o porquê, não o quê —
   o quê já está nos comentários de topo dos módulos).

## Checks de qualidade

```bash
npm run typecheck
npm test
npm run build
./scripts/db-query.sh --check -f src/sql/001_schema.sql
./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql
```

- `grep -rln '^"use client"' src/` — tem que devolver exatamente os cinco
  componentes acima (o `^` importa: `src/lib/supabase/admin.ts` cita
  `"use client"` num comentário e apareceria como falso positivo). Um
  `"use client"` novo em `src/app/` é sinal de que a fronteira foi movida sem
  decisão.
- `grep -rn "clienteAdmin" src/` — todo consumidor tem que estar em código de
  servidor, depois de uma checagem de crachá.
- `grep -rn "^import" src/lib/busca.ts src/lib/links.ts src/lib/slug.ts src/lib/ranking.ts src/lib/importar.ts src/lib/cores.ts` — não pode devolver nada.
