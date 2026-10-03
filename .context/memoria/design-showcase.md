---
name: design-showcase
description: O redesign completo vive em design/ como showcase HTML A|B; a escolha por tela é do Théo e o port ao Next.js é a Etapa 2
metadata:
  type: project
---

Em 02/10/2026 abrimos a branch `feat/design-showcase` com `design/`: hub
(`index.html`), 16 telas + galeria de classes, todas com os DOIS conceitos no
mesmo DOM (`<html data-conceito="a|b">`), moldura de troca
(`sistemas/moldura.js`), contrato em `design/PADROES.md`, elenco fixo em
`design/CONTEUDO.md` e gates em `design/scripts/verificar.sh` (0 P0 na
entrega). `src/` não foi tocado — os 331 testes e o app seguem intactos.

Conceito **A** = disciplina da casa VAMOO (Plus Jakarta Sans, papel #fcfcfc,
azul #007dff, Tabler 6px admin; spec em `~/.claude/docs/design-system-vamoo.md`).
Conceito **B** = o dark-first do app refinado, com o tema claro finalmente
desenhado (herda os nomes de token atuais para o diff da Etapa 2 ficar mínimo).

**Verificado** (por agente de QA com Chrome headless, rodadas 1–6): as 16 telas
passam nos gates e nos screenshots; o P0 sistêmico do B era um `*/` dentro do
comentário de header de `sistema-b.css:15` (`--fs-*/--sp-*`) que fechava o
comentário cedo e engolia o bloco `:root` inteiro (paleta de sala, --papel,
fontes) — sintoma: tudo cinza/system-ui no B. Corrigido em 03/10/2026.

**PENDENTE do Théo** (ver [[decisoes-sao-do-theo]]): escolher A ou B **por
tela** no hub; se o acento do A fica #007dff ou vira azul SESI #02609e (uma
linha em `sistema-a.css`); se `design/` sobrevive como doc permanente ou é
podado após o port. Dívidas não-portadas e a lista de poda estão em
`design/dividas/*.md` (16 arquivos).

**Etapa 2** (só depois da escolha): um PR por fatia, arquivo novo no fim dos
`@import` de `globals.css` (a ordem É a cascata); invariante do repo:
`classes-css.test.mjs` caça className sem CSS e `csp.test.mjs` proíbe script
inline no app. Recomendação do QA: o gate do repo deveria conferir o CSSOM real
do B (tokens-chave presentes), não só texto — o bug do `*/` era invisível ao
`verificar.sh` original.
