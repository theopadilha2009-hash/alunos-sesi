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

**Páginas 2-10 (pendentes, do Théo):** apagar faixa/banner do perfil (p2),
grade do Portfólio (p3), "Meu Perfil"
como modal (p5), editar/apagar turmas no ADM + verde feio (p5), cargos/badges
feios (p6), dois "Lucas
Bento" (p7), apagar salas menos 9 (p9), confete depois das
estrelinhas (p9).

> **CUIDADO nas p2/p3 (apagar).** O Théo respondeu "apaga tudo disso aí, parece
> um limbo, deixa só a tela normal" — mas o print de referência que ele mandou
> junto (o CRM claro "bom") **contém** o trilho de salas e os chips de
> competência, que era o que eu tinha lido como alvo da remoção. Enquanto a
> contradição não for resolvida com ele, **não apagar**. Mesma coisa no "apaga
> essa parte do escuro": depois do #99 a leitura que fecha é a do print — o
> claro é o padrão e o login é a única ilha escura.

**O que a investigação de 06/10 achou (antes de o Théo decidir):**
- **p9 "confete depois das estrelinhas"**: `estrelar` (`CrmApp.tsx:362`)
  dispara o confete no clique, antes do servidor confirmar — de propósito
  (feedback imediato). Mover para depois do `ok` é decisão.

**Nota de leitura:** várias dessas podem ter sido cobertas pelas fatias 1-8
(chips = fatia 3, cargos = fatia 3, banner = fatias 6-7, modais/avatar = fatia 7).
As que são **dado ou funcionalidade** (dois Lucas, apagar salas, PDF duplicando,
botão de denúncia) o redesign não tocou. Ver [[design-showcase]] e
[[decisoes-sao-do-theo]].
