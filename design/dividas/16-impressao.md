# Dívidas — 16 · Impressão A4

Achados de quem desenhou `telas/16-impressao.html`. Escape hatch usado com
`var()`/`color-mix()` apenas; nada de hex.

## 16-a · A folha de papel não é componente de sistema — e o conceito A não tem @media print

- O `base.css:93` anuncia "impressão real: a tela 16 chama window.print(); na
  folha só o `.folha-mundo`", mas `.folha-mundo` (ou `.folha`) não existe em
  nenhum sistema. Quem desenha a tela 16 tem que inventar do zero o remape
  `--papel/--tinta` da folha.
- Pior: **`sistema-a.css` não tem nenhum bloco `@media print`** — todo o
  tratamento de impressão (esconder chrome, papel, `break-inside: avoid`) vive
  só em `sistema-b.css § IMPRESSÃO`. No conceito A, a tela imprimida sairia com
  fundo do sistema e sem a folha remapeada; resolvi com `[data-folha]` +
  `[data-nao-imprime]` locais.
- **Proposta:** promover para o `base.css` uma primitiva `.folha` (ou
  `.folha-mundo`, como o comentário já nomeia) com o bloco de tokens de papel
  (text/surface/line/ok-aviso-perigo-info em `color-mix` de `--papel/--tinta`) e
  um `@media print` compartilhado (chrome marcado some, folha sem sombra/raio,
  `@page` A4). A tela 16 anexa e todas as telas com documento (11, 12, 13)
  herdam.

## 16-b · Pares semânticos do B são computados no :root e não seguem o papel

- `--ok-bg: color-mix(in oklab, var(--verde) 15%, var(--surface))` (e os pares
  aviso/perigo/info, `--ilha-*`) resolvem `var()` **no elemento que declara**
  (`:root`), então re-declarar `--surface: var(--papel)` num subtree da folha não
  alcança `--ok-bg`: o `.badge--ok` vinha como cápsula escura com texto claro
  sobre o papel. Tive que re-declarar os 8 pares (`--*-bg/--*-fg` + os aliases
  `--*-fundo/--*-texto` do A) dentro de `[data-folha]`.
- **Proposta:** na Etapa 2, declarar os pares semânticos como `color-mix` **na
  regra do componente** (resolução no elemento de uso) ou expor um hook
  `[data-superficie="papel"]` no sistema-b que re-basa as 8 variáveis de uma vez.

## 16-c · Nomes divergentes entre os sistemas para a mesma peça

- `.avatar-lg` (A) vs `.avatar--lg` (B): a folha precisa de avatar 72px nos dois
  conceitos e o DOM único só aceita carregar as duas classes juntas (fez isso).
- `.logo-modo-light/.logo-modo-dark` só existem no B; no A as duas `<img>`
  renderizam — toda tela com `marca-sesi` carrega `[data-conceito="a"]
  .logo-modo-dark { display: none }` de emprestado (12, agora 16).
- **Proposta:** alias de tamanho no A (`.avatar--lg`) e regra de logo por tema
  no base.css, onde o DOM dos dois logos é decisão de contrato, não de conceito.

## §Fix rodada 4 (sweep 03/10) — catálogo estourando o A4

[data-folha] é flex-column e o .corte (flex item, min-width:auto) deixava a
tabela de 5 colunas estourar os 210mm. Fix no hatch: min-width:0 no .corte +
table-layout:fixed com larguras 28/8/24/26/14% + overflow-wrap anywhere.
Vale impresso (PDF do Chrome) e em tela nos dois conceitos.
