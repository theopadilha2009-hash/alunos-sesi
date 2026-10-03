# Dívidas · 09-overlay-cracha (crachá modal / "SESI Pass")

Achados de quem desenhou o overlay. Nada aqui cria markup de conceito (regra de
ouro): são lacunas dos `sistemas/*.css` que o `<style>/* no-sistema */` da tela
contorna **só com `var()`/`color-mix()`**, e que a onda de correção deve portar.

## 1. `.modal-caixa` não sabe ser "painel sem moldura"

- **Onde:** `sistema-b.css` §"MODAL + TOAST" dá a `.modal-caixa` `background:
  var(--surface)`, `border`, `border-radius`, `box-shadow` e `padding: --sp-600`.
  O `CrachaModal.tsx` real não tem caixa nenhuma: `modal-backdrop` →
  `cracha-container` → o cartão flutua direto no backdrop.
- **Atalho na tela:** `[data-arena] .modal-caixa { background:transparent;
  border:0; box-shadow:none; padding:0; overflow:visible; animation:none }`
  (idempotente se o port acontecer).
- **Regra proposta:** variante `.modal-caixa--nu` (ou o gancho
  `[data-modal-caixa="nu"]`) em `sistema-b.css`, zerando a moldura e mantendo
  `width`/`max-height`. **Impacto:** 08 (command bar), 09 (crachá), 13 (QR de
  validação) — todo overlay cujo conteúdo É a peça, não um formulário.
- `overflow:visible` é necessário porque o cordão do crachá sangra −10px para
  cima do cartão (fonte: `.cracha-cordao-presilha { margin-bottom: -10px }`).

## 2. Overlay preso na folha: o `containing block` é técnica, não sistema

- **Onde:** `.modal` é `position:fixed` nos dois conceitos. Para o showcase
  mostrar o estado aberto SEM engolir a página, o wrapper precisa de
  `transform: translateZ(0)` — hoje isso mora só no `div[data-modal-demo]` do
  `<style>` da `galeria.html` (fora dos sistemas, portanto invisível para as
  telas).
- **Atalho na tela:** `[data-arena]` com o mesmo truque +
  `min-height: clamp(520px, 66vh, 760px)`.
- **Regra proposta:** `sistemas/base.css` ganhar `.arena-overlay` (ou o seletor
  `[data-arena]` já em uso por duas páginas) com `position:relative;
  transform:translateZ(0); overflow:hidden; border-radius:var(--raio-lg);
  border:1px solid var(--line); background:var(--surface)`.

## 3. Não existe primitivo de "cartão físico" em nenhum dos dois sistemas

- **Onde:** as cinco peças do crachá não têm classe nos sistemas — e os nomes
  reais do app (`.cracha-fita`, `.cracha-gancho`, `.cracha-furo`,
  `.cracha-chip`, `.cracha-codigo-barras`, `.barra.grossa`, `.ponto-sala`,
  `.badge-led-ponto`, `.cracha-holografico-glare`) não podem ser copiados para a
  tela porque o gate 2 caça classe órfã (e `.barra`, se copiado, herdaria o
  *progresso de insígnia* do §20 do A, quebrando o código de barras).
- **Atalho na tela:** tudo em hooks `[data-pass-*]`, cores derivadas de tokens
  (`--ilha-*`, `--cor-destaque`, `--amarelo`, `--ciano/verde/amarelo/
  vermelho-sesi`, `white`/`black` como pontos de `color-mix` — a mesma
  sintaxe que o próprio `sistema-b.css` usa em `--perigo-btn`).
- **Regra proposta (novo §"peças de documento" nos dois sistemas):**
  `.chip-contato` (o dourado), `.passante-furo`, `.cordao-fita` +
  `.cordao-gancho`, `.codigo-barras > span` com `:nth-child(3n)`/`(5n)`,
  `.led-sala` (ponto + glow de `--cor-destaque`) e `.glare-holografico` com as
  duas camadas e o `@keyframes` já escritos na tela.
  **Impacto:** 09, 11, 12, 13, 16 — quatro telas além desta pedem as mesmas peças.
- **Nota de movimento:** o tilt real do app vem de `mousemove`
  (`rotateX/rotateY ±14°`, `--glare-x/--glare-y`, escala 1.025). Sem JS no
  showcase, a tela aproxima do mesmo efeito com `perspective` + `:hover` e um
  varrimento em loop
  no `.glare`; `prefers-reduced-motion` congela as duas camadas e o tilt.

## 4. `.ilha-escura` no 09 vem com folga de banner, não de crachá

- **Onde:** `sistema-b.css` §"DOMÍNIOS" aperta
  `.tela[data-tela^="09"] .ilha-escura` com `padding: var(--sp-700) var(--sp-600)`
  (2,5rem × 2rem). Num cartão de 28rem com cordão, isso come ~15% da altura.
- **Atalho na tela:** `padding` e `border-radius` passados **inline com tokens**
  (`var(--sp-500) var(--sp-400)`, `var(--raio-lg)`) — a mesma saída que a
  galeria usa em `style="padding:var(--sp-400)"`. É o único ponto da tela que
  precisou de inline para vencer os 4 níveis de especificidade do sistema.
- **Regra proposta:** trocar o bloco 09–12 por `--sp-500 --sp-400`, ou expor
  `--ilha-p` para o chamador definir a folga.

## 5. `.olho` não tem a face "papel" que QR e selo pedem

- **Onde:** `.olho` (base.css) é o placeholder de mídia: gradiente de `--accent`
  sobre `--surface-2`, borda `--line`, texto `--faint`. O QR real do app é
  `background:#fff` com módulos escuros (`cracha.css:390-397`) — o QR precisa
  ser LIDO por câmera, então o fundo claro não é escolha estética.
- **Atalho na tela:** `[data-pass-qr]` sobrescreve `background: var(--papel)`,
  `color: var(--tinta)`, `border: 2px solid var(--papel)`.
- **Regra proposta:** `.olho--papel` (fundo `--papel`, `currentColor`
  `--tinta`, sem gradiente) — vale também para 12/13 e para o carimbo da 16.

## 6. O filete de 4 cores é só do B

- **Onde:** `sistema-b.css` pinta `.ilha-escura::before` com
  `linear-gradient(90deg, --ciano, --verde, --amarelo, --vermelho-sesi)`; no A a
  `.ilha-escura` é `var(--night)` lisa. Como a paleta SESI é **dado** nos dois
  conceitos (o próprio `sistema-a.css` a declara com esse comentário), o filete
  do cartão oficial não deveria depender do conceito escolhido.
- **Atalho na tela:** `[data-conceito="a"] [data-pass]::before` recriando o
  filete.
- **Regra proposta:** levar o `::before` para `sistema-a.css` sob
  `.ilha-escura--oficial` (crachá/NFC/validação), deixando a faixa de marketing
  sem filete.

## 7. Notas sem ação

- O botão fechar do app é um ✕ de texto circular sobre o backdrop
  (`.cracha-fechar`, hover em `--vermelho`). Usei `.modal-x` + SVG, que é o
  vocabulário do contrato; o `.modal-x` "sobre backdrop" já está coberto pela
  dívida 17 §1 (refortei as mesmas regras daqui, idempotente ao port).
- Não existe botão "girar" no fonte (`CrachaModal.tsx` só tem download, copiar,
  ver página e fechar) — a virada é a **inspeção 3D do mouse**. Mostrei o verso
  como estado próprio, abaixo da frente, em vez de inventar rótulo.
- `LinhaCargos` com `role` de aluno renderiza apenas o pill da turma; os pills
  "Fixado"/"Destaque"/"ADM" não aparecem no crachá da Alice (ela não tem cargo)
  — por isso só o LED de sala está na tela.
- O hash `a3f9…c1d2` e o `<code>` do lacre são os literais de `CONTEUDO.md`;
  o `code` do A tem `background: var(--surface-2)`, que dentro da ilha já é
  escuro — zerei o fundo só para não concorrer com o glare.
- `.kbd` (o atalho "ESC" no cabeçalho e no cartão de estados) só existe no
  sistema-b; no A ele sairia como texto solto, então portei a regra com os
  tokens do A. Menos grave que a §1, mas é o mesmo formato de peça ausente.
