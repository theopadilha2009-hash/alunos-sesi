# Dívidas · 12-cartao-nfc (Cartão NFC /u/[slug])

Achados de quem desenhou o cartão NFC. Nenhum cria markup de conceito: são
lacunas dos `sistemas/*.css` contornadas no `<style>/* no-sistema */` da tela
só com `var()`/`color-mix()`, prontas para portar na onda de correção.

## 1. `.btn` não sabe ser "linha de link com subtítulo" (o linktree do NFC)

- **Onde:** `sistema-a.css` §3 fixa `height: 36px` e `white-space: nowrap`;
  `sistema-b.css` fixa `min-height: 2.4rem`. O `page.tsx:174–267` desenha seis
  `nfc-link-btn` de duas linhas (label 0.92rem 700 + sub 0.74rem), alinhados à
  esquerda, com quadrado de ícone 36px e seta de link externo à direita — é o
  padrão linktree inteiro da tela. Sem overrides, o botão do A corta o texto.
- **Atalho na tela:** `[data-nfc-link]` (`height:auto; white-space:normal;
  justify-content:flex-start; text-align:left`), `[data-nfc-link-corpo]` e
  `[data-nfc-icone]`, com variantes de tinta `[data-nfc-link="cracha"|"selo"]`.
- **Regra proposta:** `.btn--linha` (ou `.btn--link`) nos dois sistemas: bloco
  vertical, `height:auto`, ícone-âncora + corpo (`strong` + `small.dim`) +
  chevron. **Impacto:** 12 (linktree), 09/11 (ações do crachá), 15 (links do
  not-found).

## 2. Não há primitivo de sticker/ornamento posicionado nem de "anel pulsante"

- **Onde:** o cartão físico do app é decorado — stickers absolutos sobre o
  banner e sobre o card do projeto (`.nfc-sticker-item`, `.nfc-projeto-sticker`,
  translate+rotate) e o anel de pulsação do avatar (`.nfc-pulse-ring`,
  `@keyframes pulseNfc`). Nada disso existe nos sistemas; a dívida 09 §3 já
  cobriu as peças do crachá, mas o recorte de posicionamento (âncora
  relative + overflow hidden no contêiner) precisa ser compartilhado.
- **Atalho na tela:** `.olho` com posição/rotação inline (mesma técnica da
  tela 06), `[data-nfc-banner-area]`/`[data-nfc-projeto]` como âncoras, e
  `[data-nfc-anel]` com keyframe próprio + corte em `prefers-reduced-motion`.
- **Regra proposta:** `sistemas/base.css` ganhar `[data-ancora]`
  (`position:relative; overflow:hidden`) e um utilitário `[data-anel]` com a
  pulsação (respeitando reduced-motion). Evita que 06, 09 e 12 mantenham três
  implementações locais do mesmo gesto.

## 3. Tinta de "situação institucional" nos links (vermelho SESI / verde ok)

- **Onde:** o link-destaque e o link-oficial do fonte têm fundo na cor da
  peça (vermelho da marca, verde da validação). Os sistemas só oferecem tinta
  semântica via badges (`--ok-bg`, `--info-bg`) — nada pinta `.btn` com a cor
  do conteúdo, e `--vermelho-sesi` nunca é consumido em componente nos dois
  conceitos (só no filete da ilha do B).
- **Atalho na tela:** `[data-nfc-link="cracha"|"selo"]` com
  `color-mix(var(--vermelho-sesi)/var(--verde) …, var(--surface))`; o ícone do
  LinkedIn/Instagram idem via `[data-nfc-icone=…]`.
- **Regra proposta:** variante de tom por conteúdo — ex. atributo
  `[data-tom="marca"|"ok"]` em `.btn`/`.cartao` derivando fundo/borda de
  `--vermelho-sesi`/`--ok`. **Impacto:** 11 (crachá digital), 13 (validar),
  12.

## 4. Menor (não bloqueia): `.chip` como "tag de sala colorida"

O `BadgeTurma` do fonte é um pill com LED na cor da sala (`title
"Turma escolar 3ºA"`). A tela resolve com `chip` + `[data-nfc-sala]` tingido
por `--cor-destaque`; se a dívida 09 §3 (cartão físico/insígnias) portar o
"ponto de cor da sala", isto sobra. Sem proposta nova — só não duplicar o
atrito quando o port da 09 chegar.

## 5. QA visual 02/10: avatar da ilha sem fill legível no B — P1-6 (hatch na tela)

- **Onde:** o `.avatar` do B escreve as iniciais em `color: var(--surface)` —
  dentro da `.ilha-escura`, `--surface` é re-mapeado para a tinta escura da
  própria ilha: tinta sobre tinta, o "AD" de 7.5rem some do fill ciano
  (dívida-irmã: `dividas/06-crm-meu-perfil.md` §6 e o espelho já aplicado na
  tela 11). O anel pulsante e o fill por `--cor-destaque` estavam OK — o avatar
  já injeta `--cor/--cor-destaque: var(--ciano)` inline (sala 3ºA).
- **Como a tela resolveu (hatch local, 2 regras):** `[data-conceito="b"]
  .tela[data-tela="12-cartao-nfc"] .avatar { color: var(--text) }` (na ilha,
  `--text` é o claro do remapeamento — legível sobre o gradiente da sala) +
  ponte de tamanho `[data-conceito="a"] .avatar--xl` espelhando a tela 11, que
  faltava aqui e devolve o avatar grande no conceito papel.
- **Regra proposta:** uma só — canonicar o par de tokens do avatar nos dois
  sistemas (fecha 06 §6, 11 §2 e esta junto): `--cor-destaque` com fallback
  `--cor`, e as iniciais em `--ilha-text`/`--on-accent` quando o avatar veste a
  ilha, não em `--surface`.
