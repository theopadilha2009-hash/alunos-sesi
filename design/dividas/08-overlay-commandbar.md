# Dívidas · 08-overlay-commandbar (telas/08-overlay-commandbar.html)

Lacunas que obrigaram escape hatch `<style>/* no-sistema */` nesta tela. Regra
de ouro respeitada: **um só DOM**, os dois conceitos vestem o mesmo markup — nada
aqui cria `<div>` de conceito, e nenhuma regra do hatch usa cor literal (só
`var()`/`color-mix()` dos tokens que A e B definem).

## 1. A âncora de domínio do ⌘K existe só no `sistema-b.css`

- **Onde:** `sistema-b.css` §"08 · command bar" (linhas 1298–1303) já sabe que a
  paleta abre no topo (`place-items: start center; padding-top: 12vh`), limita a
  caixa em `min(100%, 640px)` com `padding: var(--sp-300)` e tira o chrome do
  `.campo` de dentro do `.modal`. O `sistema-a.css` não tem nenhuma âncora de
  `data-tela`: o `.modal` do A é `place-items: center` e `.modal-painel` é o
  painel — `.modal .cartao` fica com `padding: var(--sp-500)` e sem largura.
- **Necessidade:** sem o par, o conceito A renderiza a paleta larga-demais e
  centrada no meio da tela, e o campo sai com borda dupla.
- **Regra usada na tela (portar para `sistema-a.css`, nova seção de domínio):**
  ```css
  [data-conceito="a"] .modal { place-items: start center; padding-top: 12vh; }
  [data-conceito="a"] .modal .cartao {
    width: min(100%, 640px); max-height: 82vh; overflow: auto;
    padding: var(--sp-300); box-shadow: var(--sombra-elev);
  }
  ```

## 2. O sistema não tem nenhuma peça de "lista de resultados"

- **Onde:** nenhum dos dois sistemas define as peças que uma paleta de comandos
  precisa: linha de resultado, cabeçalho de grupo, sublinha de metadado com
  ellipsis, ponto de cor da sala e o bloco de teclas do rodapé. `CommandBar.tsx`
  tem tudo isso na mão (`.cmd-campo`, `.cmd-lista`, `.cmd-item`,
  `.cmd-item-ativo`, `.cmd-info`, `.cmd-titulo`, `.cmd-sub`, `.cmd-badge`,
  `.cmd-rodape`, `.cmd-vazio`) e o showcase não pode importar globals.css do app.
- **Necessidade:** as telas 08 e 09 (e qualquer combobox/paleta futura) repetem
  a mesma anatomia. Cada uma reinventar no hatch é a dívida virar padrão.
- **Regra usada na tela:** bloco `.cmd-*` no hatch (geometria + tokens
  compartilhados), com os nomes do fonte para o port ser mecânico. Proposta de
  seção nova nos dois sistemas:
  ```css
  .cmd-campo / .cmd-icone / .cmd-eco / .cmd-lista / .cmd-grupo / .cmd-item /
  .cmd-item-ativo / .cmd-ponto / .cmd-info / .cmd-titulo / .cmd-sub /
  .cmd-sub-ok / .cmd-sub-erro / .cmd-rodape / .cmd-vazio
  ```
  Divergência assumida: o **badge da direita** usa o `.badge` do sistema (e
  `.badge--ok` para "Pronto"), não um `.cmd-badge` novo — mesmo efeito, menos
  classe. O `.cmd-icone-sala` do fonte virou `.cmd-ponto` (a cor entra só por
  `--cor-destaque`, token, nunca hex). `.cmd-tecla` e `.cmd-container` do fonte
  não foram portados: o painel é `.cartao` (§4) e a tecla é `<kbd>` cru (§3).
- **Estado por vez:** `.cmd-vazio` e `.cmd-sub-erro` estão definidos no hatch para
  o port sair completo, mas **não aparecem nesta captura** — a paleta está com
  match na busca e com a cópia aceita. Não é dead code esquecido: são os dois
  ramos que o fonte só renderiza um de cada vez (`CommandBar.tsx:362-363,411`).

## 3. Teclas: `.kbd`/`.sidebar-kbd` só existem no B

- **Onde:** `sistema-b.css` §sidebar define `.kbd` e `.sidebar-kbd`; o A não tem
  par. O `<kbd>` é elemento de UI real desta tela (ESC no campo, ↑/↓/Enter/ESC
  no rodapé — `CommandBar.tsx:358,435-437`).
- **Regra usada na tela:** estilo em seletor de elemento (`kbd { … }`) dentro do
  hatch, sem depender do nome de classe de um conceito só.
- **Proposta:** mover isso para o `base.css` (é primitivo, não é marca), ou dar
  ao A um `.kbd` espelhado. Se o `base.css` assumir, apagar a regra do hatch.

## 4. Painel do modal: `.modal-painel` (A) vs `.modal-caixa` (B)

- **Onde:** os dois conceitos nomeiam o mesmo slot de formas diferentes, e a
  âncora do §08
  do B aceita os dois (`modal-caixa`, `modal .cartao`).
- **Solução na tela:** usei **`class="cartao"`** como painel — é a única classe
  de cartão que os dois sistemas já desenham (A §6, B §CARTÃO), então o DOM é um
  só sem hatch de estrutura. **Proposta:** declarar `.modal-caixa` como nome
  canônico nos dois, ou aceitar `.modal .cartao` como padrão de painel.

## 5. Agrupar por tipo é adição de design, não do fonte

- **Onde:** `CommandBar.tsx:290` devolve **lista plana**
  (`[...listaAlunos, ...listaSalas, ...acoesFiltradas]`) — sem cabeçalho de
  grupo. A tela mostra `Alunos` / `Salas` / `Ações` (`.cmd-grupo` + `.eyebrow`)
  porque a ordem já é essa e o grupo dá a régua visual do ↑/↓.
- **Ação pedida ao coordenador:** decidir se o redesign adota os cabeçalhos (aí
  o `slice(0, 8)` do fonte passa a precisar de "ver mais"), e se `role="listbox"`
  aceita os `<li role="presentation">` de grupo — mantive os `role` do fonte por
  fidelidade (`aria-selected` no item ativo, `role="status"` fora da listbox).

## 6. `.marca-sesi small` só existe no B

- **Onde:** `sistema-b.css` §MARCA dá ao `small` o bloco micro-caixa-alta debaixo
  do nome (`display: block`, `--fs-100`, `letter-spacing .16em`, `--dim`). O
  `sistema-a.css` §14 estiliza `.marca-sesi` e `img`, mas nunca o `small` — com o
  DOM único dos dois logos, a marca do A sai na linha, "AlunosEscola SESI" colado.
- **Regra usada na tela:**
  ```css
  [data-conceito="a"] .marca-sesi small {
    display: block; font-weight: 600; font-size: var(--fs-100);
    letter-spacing: var(--tracking-micro); text-transform: uppercase; color: var(--faint);
  }
  ```
- **Proposta:** a mesma regra no `sistema-a.css` §14, com os tokens do A.

## 7. Nota sem ação (degradação aceita, não é hatch)

- `.metrica-valor`/`.metrica-label` (A) vs `.metrica b`/`.metrica span` (B): a
  tela usa as duas formas juntas no mesmo markup.
- `.avatar--md`, `.badge--num`, `.chip[aria-pressed]`, `.eyebrow--accent`,
  `.campo--busca` só têm par no B — no A restam degradação elegante.
- `.nav-link`/`.nav-link-ativo` (A) + `.topo nav a[aria-current]` (B): mesmo
  link, dois ganchos; nenhum hatch.
- O **caret** é um elemento estático (`.cmd-cursor`) sobre um `<span>` eco, e o
  `<input>` real fica transparente por cima: sem JS o blink nativo só aparece
  com o campo focado, e o showcase precisa do caret na captura. Não é falta de
  classe — é escolha de demonstração, registrada para o revisor não ler o input
  invisível como bug.
