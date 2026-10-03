# Dívidas · 13-validar (`/validar/[slug]` — ofício de validação de matrícula)

Nada aqui cria markup de conceito (regra de ouro). São lacunas dos `sistemas/*.css`
contornadas no `<style>/* no-sistema */` da tela **só com `var()`/`color-mix()`**;
a onda de correção deve portar as regras propostas.

## 1. Não existe primitivo "documento/ofício" — só produto

- **Onde:** `.cartao` (§CARTÃO) é a superfície de produto nos dois conceitos: sem
  filete de segurança, sem textura, sem folha limitada. O `/validar` do app é uma
  **peça impressível** (`cracha-digital.css:16-27`: caixa de 760px sobre um radial
  que escurece a volta). Nada nos sistemas expressa "isto é um documento".
- **Atalho na tela:** `[data-oficio]` — `width: min(100%, 48rem)`, `padding
  --sp-600`, filete das 4 cores em `::before` (o do `.ilha-escura` do B, aplicado à
  folha) e uma aguada de segurança em `background-image`
  (`repeating-linear-gradient(135deg, --cor-destaque 5% … )` +
  `radial-gradient(--vermelho-sesi 7% …)`).
- **Regra proposta:** `.cartao--oficio` nos dois sistemas: `max-width: var(--largura-oficio,
  48rem)`, `position: relative`, `::before` com o filete de 4 cores e
  `--aguada` (o gradiente repetido) como camada. **Impacto:** 13, 16 (impressão),
  12 (cartão NFC) e o carimbo da 11 — as quatro telas que representam papel.
- Nota: `[data-oficio] > * { position: relative; z-index: var(--z-conteudo) }` é
  necessário porque `.cartao` do A não declara `position: relative` (o do B declara)
  — sem isso o filete cobriria o timbre no conceito A. Mesmo formato de gap do
  `dividas/09-overlay-cracha.md` §6.

## 2. O verde de `.selo--validado` morre sobre a `.ilha-escura` (e não existe no A)

- **Onde:** `sistema-b.css` fecha a ilha com `[data-conceito="b"] .ilha-escura .selo
  { color: var(--ilha-accent) }` — especificidade 0,3,0, que **vence** `[data-
  conceito="b"] .selo--validado` (0,2,0). Resultado: o selo "MATRÍCULA VALIDADA ·
  ESTUDANTE ATIVO" sai **ciano** sobre fundo esverdeado, exatamente na peça onde o
  verde é a informação. No conceito A a variante `--validado` não existe (o A só tem
  `.selo` e `.selo--lacre`), então o `.selo` base pinta `color: var(--link)`
  (#0050a6) sobre `--night` → **ilegível** (~2,4:1).
- **Atalho na tela:** `[data-conceito] .ilha-escura .selo--validado` com o par
  `--verde`/`white` (0,3,0, mais tarde na cascata → ganha nos dois conceitos).
- **Regra proposta:** (a) no B, a cor de situação do selo **não** deve ser
  rederivada pela ilha — tirar `color` do bloco `.ilha-escura .selo` (deixar só o
  caso neutro) ou baixar para `.ilha-escura .selo:not([class*="selo--"])`; (b) no A,
  portar `.selo--validado`/`--fixado`/`--suave` como variantes semânticas (o A já tem
  os pares `--ok-fundo/--ok-texto` prontos). **Impacto:** 09, 11, 12, 13, 16 — toda
  tela que afirma um estado sobre a ilha escura.

## 3. Não há badge de **cor de sala** — só badge semântico

- **Onde:** o fonte tem `.validar-pill-sala` (a sala na cor dela) e
  `CargosBadges.tsx` faz o mesmo com LED. Os sistemas só têm `.badge--ok/aviso/
  perigo/info`, que codificam **estado**, não **pertence** — o `--ciano` da sala 3ºA
  não tem onde morar. O `.chip[aria-pressed]` do B até lê `--destaque-filtro`, mas é
  controle de filtro (clicável), não rótulo de documento.
- **Atalho na tela:** `[data-pill-sala]` com `--cor-destaque` (definido inline na
  `.tela` como `var(--ciano)`, como manda o contrato).
- **Regra proposta:** `.badge--sala` (`background: color-mix(--cor-destaque 18%,
  var(--surface))`, `border-color` 48%, `color` 62% → `var(--text)`) nos dois
  conceitos + `.badge--sala::before` como o LED de `09`. **Impacto:** 05, 07, 10, 11,
  12, 13, 14, 16 (todas as listas de alunos).

## 4. `--vermelho-sesi` não tem par legível por tema

- **Onde:** a sigla "SISTEMA FIESC · SESI SENAI" é vermelha no fonte
  (`cracha-digital.css:51-57`, `#E30613`). Sobre `--papel`/branco dá 4,9:1 (passa),
  mas sobre `--surface` do B escuro (#10161f) dá **3,7:1** — e em `--fs-100`
  (0,72rem) é exatamente o corpo micro-caixa-alta do timbre. Nenhum dos dois sistemas
  expõe um `--vermelho-sesi-fg` por tema (`--vermelho-sesi` é declarado no bloco
  "PALETA SESI COMO DADO", que nenhum tema redefere — por desenho, mas o *fg* fica
  sem resposta).
- **Atalho na tela:** `color-mix(in oklab, var(--vermelho-sesi) 72%, var(--text))` —
  clareia no escuro, escurece no claro, e na ilha vai para o branco da ilha.
- **Regra proposta:** `--vermelho-sesi-fg: color-mix(in oklab, var(--vermelho-sesi)
  72%, var(--text))` nos dois conceitos, para marca institucional em texto pequeno.
  **Impacto:** 10–16 (todo timbre/rodapé público) e 16 (o selo da folha).

## 5. `.ilha-escura` do B não tem folga e o bloco de domínio esquece o 13

- **Onde:** `sistema-b.css` §ILHA declara a ilha sem `padding`; a folga chega por
  `[data-tela^="09"] / ^="11" / ^="12"` (2,5rem × 2rem). O **13** não está na lista →
  a ilha chega com `padding: 0` no B, enquanto no A `.ilha-escura` já vem com
  `--sp-600`. Uma das duas ilhas nasce sem ar, e o mesmo DOM precisa de correção por
  conceito.
- **Atalho na tela:** `[data-conceito] [data-banner] { padding: var(--sp-500)
  var(--sp-600) }` (e `--sp-400` no mobile), igual para os dois conceitos.
- **Regra proposta:** dar `padding: var(--sp-600)` à `.ilha-escura` do B e expor
  `--ilha-p` para o chamador ajustar; ou incluir `^="13"` no bloco de domínio. É a
  mesma dívida §4 do `dividas/09-overlay-cracha.md`, agora com o 13 confirmado.

## 6. `.tabela` sabe ser registro × coluna, não campo × valor

- **Onde:** a ficha cadastral do app é um grid de pares **rótulo micro-caixa-alta →
  valor** (`validar-grade-dados`, `dado-rotulo`, `dado-valor`), não uma tabela de
  registros. `.tabela` existe, mas o `<td>` que é rótulo herda `color: var(--text)`
  e nenhum dos dois sistemas tem a variante "formulário".
- **Atalho na tela:** reutilizo `.eyebrow` dentro do primeiro `<td>` (é o mesmo
  micro-caixa-alta do fonte) + `[data-ficha] td:first-child { width: 42% }` e
  `min-width` para o `.corte` ter de que rolar no 390px.
- **Regra proposta:** `.tabela--ficha` (primeira coluna 40% no `--faint`
  micro-caixa-alta, sem zebra — zebra em formulário de duas colunas vira listra de
  textura, não separação de campo). **Impacto:** 13, 14, 16 e qualquer
  "detalhe de registro".

## 7. Sem primitivo de pulso/selo vivo

- **Onde:** o fonte tem `.selo-verde-icone-pulsante` com halo
  (`box-shadow: 0 0 20px rgba(16,185,129,.4)`). Os keyframes dos sistemas são
  `a-girar`/`a-shimmer`/`b-brilho`/`b-elevar` — nenhum serve a "esta credencial está
  viva agora".
- **Atalho na tela:** `[data-selo-pulso]::after` com `@keyframes validar-pulso`
  (anel 2,6s) + `@media (prefers-reduced-motion: reduce)` próprio (o `base.css` já
  corta animação em cascata; o bloco local congela também a opacidade, deixando o
  anel estático em vez de sumi-lo).
- **Regra proposta:** `.pulso` / `--pulso-cor` nos dois sistemas (o `11-cracha-digital`
  chamou a mesma peça de `.pulso-anel`) — **unificar o nome antes do port**, senão o
  showcase entrega dois primitivos para a mesma coisa.

## 8. Notas sem ação

- **Espelhos de nomenclatura** já registrados em `dividas/17-galeria.md`/`11-*.md` e
  refeitos aqui, idempotentes ao port: `.cartao-nota` e `.avatar--lg` só no A (o B
  pinta ainda por cima o `.avatar` em `--surface`, tinta sobre tinta na folha
  escura); `.selo--lacre` só no A (usei como carimbo e espelhei no B);
  `.logo-modo-light`/`.logo-modo-dark` só no B — sem o espelho do A, o timbre sai
  com as **duas** rosetas lado a lado.
- **Não inventei estados do fonte que não cabem na Alice:** os pills `Fixado`/
  `Destaque` (`page.tsx:98-99`) e o badge de Instagram (`RedesBadges.tsx:131`) só
  renderizam com dado — ela não tem cargo nem Instagram, então não aparecem. O 404 do
  não-aprovado (`page.tsx:43-45`) entrou na lateral como `.vazio` rotulado, com os
  três nomes da fila de `CONTEUDO.md`.
- `<code>` do hash: o domínio do B (§"validar (13)") já mono-calibra `code` — usei o
  elemento cru, sem classe. O valor do hash é o literal de `CONTEUDO.md`
  (`a3f9…c1d2`), prefixado com o `SESI-SC-JVE-AUTH-` do fonte (`page.tsx:160`); o app
  corta 32 hex maiúsculos (`integridade.ts:33`), detalhe escrito no `<small>` para não
  fingir que o `…` é o formato real.
- **Botões literais** do fonte: `botao-primario` → `btn--primario`, `botao-secundario`
  → `btn--secundario`, `botao-fraco` → `btn--fantasma`. Não liguei `10/11/12` por
  caminho relativo porque essas telas ainda não existem na onda — o gate 3 reprovaria;
  o "Ver a turma" usa `../index.html` (hub), como nas telas 09 e 11.
- **A ilha escura tem dois vocabulários de token.** O B expõe `--ilha-bg`,
  `--ilha-text`, `--ilha-dim`, `--ilha-line` e **remapeia** `--surface/--text/--dim`
  dentro de `.ilha-escura`; o A expõe `--night`, `--ilha-texto`, `--ilha-faint` e não
  remapeia nada — então, no A, corpo solto dentro da ilha herda `--dim` (#677294)
  sobre `--night` e reprova em contraste. Esta tela precisou de
  `var(--ilha-text, var(--ilha-texto))` para o texto do banner fechar nos dois
  conceitos. **Regra proposta:** um único jogo de nomes (`--ilha-*`) e o remapeamento
  do B portado para o A, ou documentar que no A a ilha só aceita tipografia forte.
  **Impacto:** 09, 11, 12, 13 e toda `.cta-band` do A.
- **Não verifiquei pixel:** sem browser neste contexto, a tela não foi aberta. Os
  gates por arquivo (`bash design/scripts/verificar.sh`) passam para 13-validar (0
  ocorrências minhas em cor literal, classe órfã, link e cabeçalho obrigatório).
