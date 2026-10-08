---
name: feedback-pdf-plataforma-sesi
description: As 23 anotações do PDF "Plataforma sesi (1)" (Théo, 06/10) — o que já fechou, o que é fix de design e o que é feature/decisão
metadata:
  type: project
---

Em 06/10/2026 o Théo mandou `~/Downloads/Plataforma sesi (1).pdf` (10 páginas,
capturas do app em produção com anotação à mão). São **23 anotações** — feedback
**anterior ao redesign** (fatias 1-8), então parte já morreu de tabela. Ele
pediu: "faz a primeira frente que você sabe, deixa os pendentes depois".

**Frente 1 (página 1) — FECHADA em 06/10:**
- ✅ **Matrícula e e-mail em 2 linhas** no mini-currículo A4 → **PR #94**. Causa:
  `.curriculo-contatos-grid` era `grid` de 2 colunas `1fr` (314px cada) e a
  matrícula (27ch) não cabia → virou `flex-wrap` + `white-space: nowrap`.
- ✅ **"bloco azul estranho" no crachá** → **PR #95**. Era `.cracha-cordao-presilha`
  (fita 44×24 com `linear-gradient(90deg,#38c7bd,#3b82f6,#38c7bd)`) acima do card.
  Removido do JSX e do CSS. O `cracha-furo` ficou (o showcase B também o desenha).
  O PNG exportado não mudou: `baixarCrachaPng` desenha do zero no canvas.
- ✅ **p8 "baixar PDF duplica as páginas"** → **PR #97**. A folha A4 abre DENTRO
  do `.crm-layout`; sidebar, main e o `.modal-perfil-breve` ficavam montados
  atrás e entravam no fluxo de impressão (5 páginas). Fix: `@media print {
  .crm-layout:has(.curriculo-folha-a4) > :not(.curriculo-modal-backdrop)
  { display: none } }` + backdrop `position: static` (fixed repetiria a folha
  por página). O `:has()` escopa — a impressão do **Catálogo** usa o mesmo
  `.crm-layout` sem currículo e seguiu igual (5 páginas, 17 linhas). Medido:
  1 página para os 17 alunos; a folha mais alta (Théo) = 749px de 1009px úteis.

**Frente 2 (p3 e p10) — FECHADA em 06-07/10:**
- ✅ **p3 "GIF em cima do texto"** → **PR #98**. O sticker era preso ao CARD
  inteiro (`.card-projeto-vitrine`, com `x`/`y` livre em %), então caía sobre a
  descrição. Fix: faixa `.projeto-midia` (a foto + os stickers dela) com
  `position: relative; overflow: hidden` — o sticker pode ser clipado na borda
  da foto, nunca desce para o texto. O `style` inline de posicionamento saiu do
  card. Tocado em `ModalPerfilBreve.tsx` e `PerfilInterativo.tsx`.
- ✅ **p10 "criar aba ainda em construção o sesi"** → **PR #100**. Item de menu
  **Em construção** (ícone de capacete + selo "Em breve") entre "Meu Perfil" e
  "Painel ADM"; tela `PaginaEmConstrucao` com a logo SESI, selo "Espaço
  reservado", recado de área em preparação e botão **← Voltar ao Portfólio**
  (o "não um limbo aleatório que não tem como sair"). A logo sai do `LogoSesi`
  (`Roseta.tsx`), que já monta o par colorida/branca por tema — não duplicar
  PNG. Achado no caminho: o header do CRM tinha um `else` que caía em "Painel
  do Administrador" para QUALQUER aba fora das quatro mapeadas; a aba
  **Mural de Desafios** ainda cai nele (defeito pré-existente, não tocado).

**Tema — decidido e fechado em 06/10:**
- ✅ **"o app abre no claro, o login continua escuro"** → **PR #99**. O Théo
  respondeu com um print do CRM **claro** dizendo "só essa tela aí e tudo que
  tem nela, não um limbo aleatório que não tem como sair" — ou seja, o claro é
  o bom. `layout.tsx`: `data-theme="light"` + `themeColor: "#f8fafc"`. O login
  virou **ilha de tema** (`ilhas-2026.css`, no FIM dos `@import`): o
  `data-theme` vive no `<html>` e não dá para excluir uma subárvore por seletor,
  então a tela repina os tokens do escuro no container `.login-tela-container`.
  Detalhe que custou uma rodada: o `<body>` do login pinta o "elástico" da
  rolagem e fica FORA do container — `var(--bg)` ali resolve no `:root`, então
  o valor vai **literal**.

**Página 1, ainda aberto:**
- **"botão de denúncia pra tudo"** — **feature nova**, não fix. Exige decisão
  (o que denunciar, para onde vai, quem vê) e schema. Não começar sem o Théo.

**Frente 3 (p4, p7, p8, p9) — FECHADA em 07/10:**
- ✅ **p4 "logo → home"** → **PR #102**. A marca da sidebar do CRM era um
  `<div>` morto. Virou `<button>` que volta ao **Portfólio** (não `/`: a raiz é
  o login, então seria logout disfarçado). Carrega o reset de botão junto, senão
  o navegador traz o cinza padrão e a marca deixa de parecer a marca.
- ✅ **p7 "esses quadrados" / "horroroso"** → **PR #104**. O
  `.tag-habilidade-clean` era o ÚNICO chip da tabela com `border-radius: 6px`;
  os de sala ao lado e os selos já eram pílula. Vira pílula como os vizinhos.
  (A hipótese antiga — `.nav-item` ou `.btn-alvo-opcao` — estava errada.)
- ✅ **p7 "não entendi a parte de validar"** → **PR #104**. O rótulo "Validar
  Matrícula" lia como comando que altera algo; virou "Ver autenticidade do
  crachá" nos dois lugares (`PaginaMeuPerfil`, `PerfilInterativo`). E a página
  `/validar/[slug]` ganhou uma frase de abertura (o que ela confirma, que vem do
  QR, e que dado divergente = documento falso) + uma linha explicando o código
  de integridade, que antes era só o jargão "HMAC-SHA256".
- ✅ **p8 "botão vermelho significa erro"** → **PR #105**. O `.btn-alvo-ativo`
  usava o vermelho institucional — a mesma cor de PERIGO do resto do app — para
  marcar o item SELECIONADO. Passou para o par do `.nav-item-ativo`
  (`--accent` + `--text`), que resolve nos dois temas sozinho; o override de
  claro que existia só para consertar o contraste do vermelho saiu junto.
- ✅ **p9 "mover sticker sobrepõe"** → **PR #103**. Com dois elementos
  empilhados, o clique caía no de CIMA e o `stopPropagation` dele só trocava a
  seleção — o de baixo não saía do lugar. Agora o elemento é **arrastável**
  (`setPointerCapture`), e o que faz o arrasto sobreviver a passar por cima de
  outro é a captura. **Pegadinha que custou uma rodada:** o `draggable` nativo
  da `<img>` assume o gesto e dispara `pointercancel` no primeiro movimento — o
  sticker anda 2px e trava. Medido: 2 `pointermove` + 1 `pointercancel` antes,
  11 movimentos e destino exato depois. Fix: `preventDefault` no `pointerdown`
  + `-webkit-user-drag: none` na `<img>`.

**Frente 4 (p5 e p6) — FECHADA em 07/10:**
- ✅ **p5 "verde tá feio"** → **PR #107**. O "Turma sem alunos cadastrados." usa
  `var(--verde)` (#38b95d), que é DADO de sala no `tokens.css` neutro — sobre o
  card de papel claro dá ~2,9:1 em 11,5px e reprova AA. No claro desce para
  `#15803d`, o mesmo par do showcase B que `claro-crm.css` já usa nos outros
  status. **Achado no caminho:** o `.sala-cor-circulo` dos cards do ADM era
  `var(--accent)` fixo — as 12 turmas saíam todas com o mesmo ponto azul, e a
  cor da turma é identidade em todas as outras telas (`corDaSala`). Agora lê
  `corDaSala(s.nome)`: 13 cards, 5 cores distintas.
- ✅ **p6 "cargos feios pra crl"** → **PR #108**. A anotação apontava os selos do
  topo do modal-breve; a investigação achou embaixo deles um defeito maior: com
  banner, o `.breve-topo` é **ilha de foto** (scrim escuro nos dois temas), mas
  nome/chip de sala/"Validado"/estrelas/selos liam tokens do CLARO — `h2` em
  `rgb(15,23,42)` sobre o scrim. É o mesmo caso que `claro-crm.css` já resolve
  para `.card-usuario-logado` com banner e `.perfil-hero-banner`; o modal-breve
  tinha ficado de fora. Classe `breve-topo-com-banner` vem do TSX (não
  `:has([style*=...])`, que dependeria da serialização do React).
  **Pegadinha:** repinar `--text` no container NÃO alcança o `h2` — a regra do
  `crm.css:1322` não declara `color`, então o elemento herda do `body`, que
  resolveu `var(--text)` no `:root`, fora da ilha. O `h2` precisa de `color`
  explícito.
  **Furo fechado depois (PR #113, review independente):** o pin do #108 levou
  só `--text/--dim/--faint/--accent/--glow`. Faltaram `--surface`,
  `--surface-2` e `--on-accent`, que o **avatar de iniciais** (fundo
  `color-mix(--accent/--sala 22%, --surface-2)`) e o **pill "Ver Crachá"**
  (fundo `color-mix(--accent 12%, --surface)`) consomem — os dois moram DENTRO
  do header com banner. No claro com banner davam 1,18:1 e 1,70:1. Agora
  20,04:1 e 11,40:1. Lição: ao pinar uma ilha, olhar o CONSUMIDOR de cada
  token, não só o texto.

**Frente 5 (p4 e as p2/p3) — FECHADA em 07/10:**
- ✅ **p4 "saio os confettis das estrelinhas depois que dá estrelinhas"** →
  **PR #110**. As três telas que dão estrela (`CrmApp`, Vitrine pública,
  `PerfilInterativo`) disparavam som e confete no CLIQUE, antes do `await` de
  `/api/estrela`. Numa recusa (pendente, rate limit, sem cookie) a pessoa via a
  festa e logo o número voltando ao de antes. Agora o efeito sai no caminho de
  sucesso, junto com a contagem real; o voto segue otimista. Medido com
  Playwright em `/alunos` (`reducedMotion: no-preference`): voto confirmado →
  chunk de `canvas-confetti` pedido; voto recusado (404 do mock) → chunk não
  pedido, contador 11→11 e recado na tela.
- ✅ **p4 "muda um eu ccolo encima outro nao"** → **já resolvido pelo PR #103.**
  É a MESMA anotação do p9 (o comentário de `StickerCanvas.tsx:190` a cita
  literalmente: "muda um, eu clico em cima de outro não"). O arrasto com
  `setPointerCapture` fechou as duas — com dois elementos empilhados o clique
  caía no de cima, e o arrasto resolve sem depender de qual está na frente.
  Ficou como "não mapeado" por engano até esta checagem.
- ✅ **p2/p3 "apaga essa merda" / "apga tudo que tem a ver com isso aquiu"** →
  **resolvido, sem código novo.** As capturas dessas páginas são do tema
  ESCURO, e as anotações são texto SOLTO sob a captura — nenhuma seta/rabisco
  liga a um elemento (verificado no PDF renderizado). O alvo é o tema escuro,
  que o **#99** já tirou. Não eram os chips de competência nem a grade de
  alunos: o próprio print de referência do Théo (o CRM claro "bom") contém os
  dois.

**Frente 6 (p5 "Meu Perfil como janela") — FECHADA em 07/10:**
- ✅ **p5 "clicando no meu perfil ele abre como se fosse uma janela nova onde
  tudo fica mais bem distribuído, pois o meu perfil tem muita poluição visual,
  e isso deveria ser rápido"** → **PR #112**. O editor era uma ABA do CRM:
  dividia a tela com a sidebar e a moldura do header, e o conteúdo denso (hero
  + 6 abas + barra de salvar) ficava espremido. Virou **janela**
  (`MeuPerfilModal`): 76rem × 92vh, scroll interno, fechar no ✕/backdrop/ESC,
  trava de foco e ESC respeitando o diálogo aninhado (com o crachá aberto
  dentro, o 1º ESC fecha só ele). "Meu Perfil" saiu da navegação da sidebar e
  da lista de abas; o card do usuário e o botão do header abrem a janela. O
  breadcrumb do `PaginaMeuPerfil` saiu (ruído dentro da janela). As 6 abas, a
  barra de salvar e o hero ficaram idênticos — a mudança é a moldura.
  **Regressão que ela causou (fechada no PR #115):** o mini-currículo A4
  imprimia **em branco**. A regra `@media print` do #97 esconde os filhos
  diretos do `.crm-layout` exceto `.curriculo-modal-backdrop` — mas com o editor
  em modal o currículo virou descendente de `.modal-meu-perfil`, que É filho
  direto do `.crm-layout`. O `display:none` pegava o modal inteiro (medido:
  folha com largura 0). Fix: abrir exceção para `.modal-meu-perfil` (e
  `display:block` nele — o `.modal-backdrop` é `grid`, e como item de grid a
  caixa encolhia ao conteúdo) + `.pagina-perfil-container:has(.curriculo-folha-a4)`
  escondendo os irmãos da folha. **Lição:** qualquer coisa que passe a abrir
  dentro de outro modal herda as regras de impressão do modal de fora; testar
  impressão é parte de mexer em aninhamento.

**Páginas ainda pendentes (do Théo):** editar/apagar turmas no ADM (p5 —
**feature**, não fix), dois "Lucas Bento" (p7 — **dado**, não código), apagar
salas menos 9 (p9 — **dado/decisão**), botão de denúncia pra tudo (p1 —
**feature**).

> **p2/p3: a contradição está resolvida.** O "apaga tudo disso aí, parece um
> limbo" era sobre o TEMA ESCURO (as capturas são escuras), não sobre os
> chips/grade — o print de referência do Théo contém os dois. Fechado pelo
> **#99**: o claro é o padrão e o login é a única ilha escura.

**Nota de leitura:** várias dessas podem ter sido cobertas pelas fatias 1-8
(chips = fatia 3, cargos = fatia 3, banner = fatias 6-7, modais/avatar = fatia 7).
As que são **dado ou funcionalidade** (dois Lucas, apagar salas, PDF duplicando,
botão de denúncia) o redesign não tocou. Ver [[design-showcase]] e
[[decisoes-sao-do-theo]].
