---
name: pendencias-de-decisao
description: O que ficou pendente por ser decisão (design/produto), não por falta de trabalho — com o fix já calculado em cada caso
metadata:
  type: project
---

Levantado em 2026-09-25, ao fechar a onda 3/4. Nenhum destes é oversight: cada um
foi identificado, medido, e parado de propósito esperando decisão. Não "conserte"
nenhum deles como se fosse bug esquecido.

- **Focus trap ausente nos 5 diálogos.** `CrachaModal`, `CurriculoImpressao`,
  `CommandBar`, `ModalPerfilBreve` e `MuralDesafios` declaram `aria-modal="true"`
  mas o Tab escapa para o conteúdo atrás. O foco já entra e volta desde o PR #10
  (**4af04f8**), o que falta é *circular* dentro do diálogo. Fix: um hook
  compartilhado entre os 5 — julgamento de design porque muda o comportamento de
  teclado em toda a app.
- **`--faint` do tema escuro em 4,09:1** sobre `--bg` e **3,8:1** sobre
  `--surface` (AA pede 4,5:1 para texto normal; o token é usado em texto de
  11-13px). O tema claro foi corrigido e está em 4,55:1, documentado em
  `src/app/styles/tokens.css:58`. Cálculo pronto: `#6b7c93` dá 4,57:1 sobre o
  `--bg`, mas para passar também sobre o `--surface` precisa de algo como
  `#74849b` (4,77:1). Decisão de design porque mexe em 39 usos e achata a
  hierarquia entre `--faint` e `--dim`.
- **`PainelAdmIntegrado` deixou de desmontar a aba inativa** no PR #7. Antes,
  trocar de aba descartava o formulário; agora o estado e o `useActionState`
  persistem. Mudança de comportamento visível que ninguém pediu — falta decidir
  se é o desejado.
- **Ícones 192 e 512 são wordmarks** (165x64 e 264x64) rotulados como quadrados
  no manifest. Peça de design, para o Daniel.
- **`/alunos/[slug]` é indexável** (`src/app/sitemap.ts` lista um URL por aluno;
  `/u/[slug]` é `noindex`). O perfil expõe nome, bio e badges sociais. Escolha de
  privacidade/produto, não técnica.

**Why:** os três primeiros parecem bugs para quem lê o código depois — `aria-modal`
sem trap, token abaixo de AA, estado que persiste sem querer. Sem esta nota, a
próxima sessão gasta tempo redescobrindo que já eram conhecidos, ou pior, "corrige"
uma decisão pendente sem o Ruan.

**How to apply:** ao tocar em qualquer um destes, leve o fix calculado e peça a
decisão — não aplique. Ver [[infra-deploy]] para o fluxo de PR/deploy.
