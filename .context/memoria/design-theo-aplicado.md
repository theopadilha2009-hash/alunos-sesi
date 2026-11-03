---
name: design-theo-aplicado
description: "PR #158 (03/11/2026) aplicou a paleta Céu e o gosto do design-theo no app inteiro; o acento deixou de ser teal e 9 selects nativos morreram"
metadata:
  node_type: memory
  type: project
  originSessionId: a71c9464-0da5-4c48-8d67-0d8df4d6382f
  modified: 2026-11-03T21:53:17.053Z
---

O `/design-theo` foi aplicado no app inteiro no PR #158 (03/11/2026, squash em `bd8e642`).

- **A paleta Céu nunca tinha chegado aqui.** O acento era teal `#38c7bd` (escuro) e azul
  institucional `#02609e` (claro). Agora: `--accent` `#1477a0` no claro e `#4fb3da` no escuro, com
  `--primary/--ring/--brand` criados em `tokens-2026.css`. O vermelho SESI `#e30613` continua sendo
  marca, não acento.
- **9 `<select>` nativos foram eliminados** por `src/components/Selecao.tsx` (B12, listbox próprio
  com teclado e busca). A regra da skill proíbe o dropdown do sistema.
- **Dois P0 que o `tsc` não pega:** campo focado não acendia (anel era `--glow` com alfa 0,12 e
  `outline: none`), e `prefers-reduced-motion` cobria 3 de 9 arquivos animados com 6 loops infinitos.
  Ambos corrigidos (`movimento-2026.css` é global e entra por último na cascata).
- **Impressão:** o PDF do perfil público imprimia a página inteira antes da folha A4, porque a regra
  de `@media print` só cobria `.crm-layout` e `.pagina-perfil-container`.

**Armadilha para a próxima sessão:** o QA visual pegou dois erros que os checks estáticos aprovaram —
o login no claro ficou com título a ~1,1:1 (o card perdeu transparência e a tinta da ilha parou de
valer; por isso `.login-card` agora declara `color: var(--text)`) e o painel da seleção abria sem fundo
porque eu copiei a classe `vidro` do Atlas, que **não existe neste app**. Não portar nome de classe do
Atlas sem conferir se existe aqui.

Sem lint no repo: o gate real é `npm run typecheck` + `npm test` (342 testes).
Ver [[tabela-corte-e-o-falso-peso]] e [[infra-deploy]].
