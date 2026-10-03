---
name: design-showcase
description: O redesign vive em design/ como showcase A|B; a Etapa 2 (port ao app) FOI EXECUTADA com B como alvo por decisão de autonomia — pendências por tela continuam do Théo
metadata:
  type: project
---

Em 02/10/2026 abriu `design/`: hub, 16 telas + galeria com os DOIS conceitos no
mesmo DOM (`data-conceito="a|b"`), contrato em `design/PADROES.md`, gates em
`design/scripts/verificar.sh`. Conceito **A** = disciplina da casa VAMOO;
conceito **B** = o dark-first do app refinado com o claro finalmente desenhado
(herda os nomes de token atuais pra diff mínimo). P0 sistêmico do B corrigido
03/10: um `*/` dentro do texto de comentário em `sistema-b.css:15` fechava o
comentário cedo e engolia o bloco `:root` inteiro — lição: gate de CSS valida
CSSOM, não texto.

**Etapa 2 executada em 03/10/2026** (diretiva `/goal termina tudo`; sem Théo
online e sem Ruan/Daniel no projeto — [[decisoes-sao-do-theo]] → recomendou-se e
executou-se): **B refinado como alvo do app**, 5 PRs mergeados com CI verde, um
por fatia, sempre arquivo novo no FIM dos `@import` de `globals.css`:

- **#81 tokens**: `--vermelho-sesi/-rgb/-texto` + alias `--cor-destaque:
  var(--sala)`; os 33 literais da marca viraram token; fix do Hall da Fama
  (setter usava `--sala-cor` pra cor do ALUNO — contrato em `lib/tipos.ts`).
- **#82 tema claro**: `claro-<dominio>.css` ×7 escopados em
  `:root[data-theme="light"]`; doutrina ILHA (crachá/NFC/validar/canvas do
  estúdio ficam escuros nos 2 temas — pin de 12 tokens com VALOR LITERAL,
  porque `--fg/--border` resolvem no `:root` e repinar `--text` não os move);
  tinta de status dos tokens de sala virou override local (não se mexe no
  token que também pinta fundo de chip).
- **#83 primitivos**: `.botao-secundario` (existia em 5 usos SEM CSS — o
  secundário renderizava primário!), campo ×3 dialetos numa caixa só
  (`--ctrl-h: 2.75rem`, `--raio-md: 12px`), chips unificados; saiu da
  `SEM_CSS` do `classes-css.test.mjs` no MESMO commit (a armadilha do repo:
  estilizar sem tirar a entrada quebra o teste).
- **#84 loading**: `loading.tsx` nas 6 rotas (o app não tinha NENHUM) +
  família `.esq`; `<html suppressHydrationWarning>` + `TemaHidratacao`
  (reaplica tema no `useLayoutEffect` — StrictMode dev).
- **#85 P0s portados**: chão `min-width:0` do card CRM + A4 do catálogo
  (piso zero + `table-layout:fixed` + `break-word`; `anywhere` parte nomes
  próprios). Scroll-tabela e capa-sobreposta NÃO existem no app; kill-switch
  de motion ficou onde está (decisão).

**PENDENTE do Théo**: (1) a escolha por tela A|B continua em aberto — o port
usou B; trocar depois é reposicionar os `claro-*`/primitivos, a arquitetura
aguenta; (2) P0 #5 — barra de insígnia usa `--faint` (cinza) em vez da cor da
sala: decisão de cor, não bug; (3) rotação dos tokens do transcript
([[rotacionar-tokens-do-transcript]]).

**Etapa 3 (não iniciada, por risco de pixel)**: cisão de `crm.css` (4.2k
linhas) + `marca.css`; escala tipográfica `--fs/--sp/--z` no app (399
font-size avulsos); porta-base do `.botao` pra forma B (muda 34 usos); tabela
de alunos duplicada (crm × vitrine — crm vence os empates hoje; deletar uma
muda pixel). Dívidas por tela em `design/dividas/*.md`.
