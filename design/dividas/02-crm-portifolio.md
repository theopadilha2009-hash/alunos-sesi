# Dívidas · 02-crm-portifolio (telas/02-crm-portifolio.html)

Lacunas que o `/* no-sistema */` da tela contorna hoje. Nada aqui é markup de
conceito (regra de ouro do PADROES): são classes definidas num sistema e sem par
no outro — a tela é um DOM só e os dois precisaram de ponte.

## 1. O frame do CRM (`.quadro` + `.quadro-corpo`) só existe no A

- **Onde:** `sistema-a.css` §15 define `.quadro`/`.quadro-corpo` (sidebar +
  corpo). Em `sistema-b.css` não há par — o B do app desenha o shell com
  `crm-layout` próprio, e a `galeria.html` contornou com DOM diferente por
  conceito (linhas 574–634). A tela 02 (e 03–07/09, que usam o mesmo shell) não
  pode: um DOM, dois conceitos.
- **Atalho na tela:** duas regras no `/* no-sistema */` (flex + stretch +
  `--raio`/`--line` do B, e `flex-direction: column` sob `data-frame="mobile"`).
- **Regra proposta (sistema-b, seção CRM):**
  ```css
  [data-conceito="b"] .quadro { display: flex; align-items: stretch; min-height: calc(100vh - var(--esp-palco)); background: var(--bg); border: 1px solid var(--line); border-radius: var(--raio); overflow: hidden; }
  [data-conceito="b"] .quadro-corpo { flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; }
  html[data-frame="mobile"] [data-conceito="b"] .quadro { flex-direction: column; }
  ```
- **Impacto:** telas 01–07/09 — todas repetirão o mesmo hatch se não portar.

## 2. Peças da sidebar cruzadas: B não tem `.sidebar-marca`/`.sidebar-pe`; A não tem `.sidebar-rodape`/`.kbd`

- **Onde:** o A define `sidebar-marca`/`sidebar-pe` (crachá do usuário); o B
  define `sidebar-rodape`/`kbd`/`sidebar-sub` — e o rodapé com avatar+nome+matrícula
  (real: `card-usuario-logado`, `CrmApp.tsx:533-594`) não tem classe equivalente
  no B.
- **Atalho na tela:** `.sidebar-marca` (coluna), `.sidebar-pe` (cartão com
  `--surface-2`/`--raio-md`) no B; `.sidebar-rodape` (lista com divisória) e
  `.kbd` no A.
- **Regra proposta:** num só contrato de sidebar nos dois sistemas:
  `.sidebar-marca` (topo), `.sidebar-nav`, `.sidebar-pe` (usuário logado),
  `.sidebar-rodape` (ações), `.kbd`. Cada sistema veste; os nomes existem nos dois.

## 3. Avatar: A lê `--cor`, B lê `--cor-destaque` — o DOM não decide dois nomes

- **Onde:** `sistema-a.css` §18 usa `var(--cor, ...)`; `sistema-b.css` (AVATAR)
  usa `var(--cor-destaque)`. A tarefa prescreve `style="--cor-destaque: var(--ciano)"`
  no DOM; no A o avatar ficaria sem cor de sala.
- **Atalho na tela:** `[data-conceito="a"] .avatar { --cor: var(--cor-destaque, var(--accent-fill)); }` no hatch.
- **Regra proposta:** adotar `--cor-destaque` como único token de cor por
  instância (ele já é o alias do PADROES); o A passa a lê-lo também.
- **Nota:** o mesmo duplo nome aparece na `galeria.html` (linhas 443–451 vs
  462–469 usam `--cor` num conceito e `--cor-destaque` no outro — dois DOMs).

## 4. `.cartao--cheio`/`--interativo` e as fatias do card não existem no B

- **Onde:** `cartao-corpo`/`cartao-rodape`/`cartao--cheio` só no A §6. O B tem
  `cartao--interativo`/`--sala`/`--destaque`, mas o card cheio (capa `.olho`
  sangrando) sai com padding dentro — o Top 3 da tela 02 usa capa.
- **Atalho na tela:** `[data-conceito="b"] .cartao--cheio` (coluna, sem gap,
  overflow) + padding `--sp-400/--sp-500` nas três fatias.
- **Regra proposta:** portar §6 do A inteiro para o B (mesma gramática já usada
  no port do modal da dívida 17).

## 5. `.tabela-truncada` só no A

- **Onde:** `sistema-a.css` §9; o painel "Tabela por Sala" da tela 02 precisa
  truncar a bio (coluna larga em B). No B sem a regra, a bio quebra o layout da
  tabela.
- **Regra proposta:** levar a definição para o B (idêntica, com `max-width` em
  `ch`), ou movê-la para `base.css` — é primitivo de tabela, não cor.

## 6. Classes novas que o hatch criou — candidatas a virar sistema

- **`.chip-sala`** (chip colorido pela sala via `--cor-destaque` com
  `color-mix`): existe no real como `card-port-sala`/`ficha`+`--sala`
  (`CrmApp.tsx:711-745, 880-885`). Sem par no showcase; a tela usa em 25+
  instâncias. Proposta de regra canônica (a do hatch, sem escopo de tela).
- **`.chip-estrela`** ativo em `--amarelo` sobre o papel no A: o B já tinge o
  chip pressionado com `--destaque-filtro`, então só falta o par no A
  (`CrmApp.tsx:897-917` é botão-estrela real com `aria-pressed`).
- **`.eyebrow` como título de bloco** (`Salas & Estudantes SESI`): estilizei no
  markup com `style` em vez de classe nova; se o coordenador quiser, um
  `.titulo-secao` nos dois sistemas substitui o truque.

## 7. Notas sem ação

- O `⌘K` da busca vive num `.btn--full` (real: `sidebar-busca-btn`, classe
  própria do app) — nenhuma classe nova foi criada para ele.
- `Sair` no real é `<form action={logoutAction}>` (proibido no showcase); virou
  `.btn--fantasma` estático mantendo `title`/`aria-label` literais.
- O segmentado Tabela×Cards usa `.aba` (tab real do contrato, funcional via
  `moldura.js`) em vez de inventar `.btn-modo`; no app o default é "tabela"
  (`CrmApp.tsx:213`), na tela o default demonstrado é "Cards" para o grid dos 10
  alunos ser o estado padrão do screenshot — mudança de ordem de abas, não de DOM.

## 8. QA visual 02/10: `.cartao-cabeca` não é flex no A — P0-2 (hatch na tela)

- **Onde:** `.cartao-cabeca` não existe em `sistema-a.css` §6 (só o padding do
  B via `.cartao--cheio`, e ainda assim por hatch da própria tela). No grid de
  cards do painel "Cards", o A empilhava avatar, nome e `.chip-estrela` no fluxo
  do texto — no screenshot, "Alice Duar★14" com o chip sobre o nome.
- **Como a tela resolveu (hatch local, só no A):** `[data-conceito="a"]
  .tela[data-tela="02-crm-portifolio"] .cartao-cabeca { display: flex;
  align-items: center; gap: var(--sp-200) }` + `flex: none` no avatar,
  `min-width: 0` no `.ocupada`/`h3` e estrela com `margin-left: auto` (fora do
  fluxo do texto).
- **Regra proposta:** definir `.cartao-cabeca` nos dois sistemas como
  `flex + align-items:center + gap --sp-200 + min-width:0 no filho ocupado`
  (o cabeçalho do card é sempre isso; no B hoje é só fatia de padding).
