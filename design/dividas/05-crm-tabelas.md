# Dívidas · 05-crm-tabelas (telas/05-crm-tabelas.html)

Achados de quem desenhou a rota `/` na aba "Tabelas". Nenhum deles muda markup de
conceito (regra de ouro): são lacunas dos sistemas que o `<style>/* no-sistema */`
da tela contorna com `var()`/`color-mix()` e tokens já existentes, e que a onda de
correção deve portar. Nenhum escape hatch aqui inventa cor nem classe de conceito.

## 1. Nenhum conceito roteia `--cor-destaque` para dentro de `.selo`/`.chip`

- **Onde:** o gancho documentado no B (`sistema-b.css:41-47` — "Tela/inline define
  `--cor-destaque` pontualmente") só é lido pelo `.avatar`, pelo `.metrica--destaque`
  e pelo `.cartao--destaque` do B. No A o `.selo` resolve `--accent` e `--accent-soft`,
  e no B o `.selo` resolve `--destaque-sala`: **os dois são aliases resolvidos no
  `:root`**, então um `style="--cor-destaque: var(--ciano)"` na linha da tabela não
  os alcança (var() de custom property é substituído no elemento onde a
  declaração aparece).
- **Efeito na tela:** sem o atalho, a coluna Sala vira um selo monocromático e a
  cor da sala existe só no avatar — a informação que o app codifica com cor
  (`cores.ts` → `badge-sala-tabela`) some de onde o professor lê rápido.
- **Atalho na tela:** `.selo--sala` local, derivando tudo de `--cor-destaque`.
- **Regra proposta (nos dois sistemas, junto da família `.selo`):**
  ```css
  [data-conceito="a"] .selo--sala, [data-conceito="b"] .selo--sala {
    border-color: color-mix(in oklab, var(--cor-destaque) 55%, var(--line));
    background: color-mix(in oklab, var(--cor-destaque) 14%, var(--surface));
    color: color-mix(in oklab, var(--cor-destaque) 52%, var(--text));
  }
  ```
  Assim o `cores.ts` do app tem uma peça só para os dois conceitos — hoje ele
  precisaria de `badge-sala-tabela` (A) e `selo--sala` (B).
- **Impacto:** toda tabela com cor por linha (05, 07, 14) repete o atalho.

## 2. `.quadro`/`.quadro-corpo` só existem no conceito A

- **Onde:** `sistema-a.css` §15 (`display:flex` + `flex:1 1 560px`). O B tem
  `.sidebar` (`sistema-b.css` §"SIDEBAR + NAV") mas **nenhum par sidebar+conteúdo**:
  o shell do CRM das telas 01–07/09 empilha no B.
- **Atalho na tela:** `display:flex` no `.quadro` e `flex:1 1 560px` no
  `.quadro-corpo`, escopados em `[data-tela="05-crm-tabelas"]`, mais o `flex-wrap`
  de coluna no `data-frame="mobile"`.
- **Regra proposta (sistema-b, na seção de CRM):**
  ```css
  [data-conceito="b"] .quadro { display:flex; flex-wrap:wrap; gap:0; background:var(--bg); }
  [data-conceito="b"] .quadro-corpo { flex:1 1 560px; min-width:0;
    display:flex; flex-direction:column; }
  [data-conceito="b"][data-frame="mobile"] .quadro { flex-direction:column; min-height:780px; }
  ```
  Sem seletor de `data-tela` no port (o A não tem escopo equivalente): `.quadro`
  é estrutura, igual a `.wrap`/`.linha` do base.css.

## 3. `.topo-titulo`, `.forte` e `.logo-modo-dark` existem em um conceito só

- `.topo-titulo` (`sistema-a.css` §14) e `.forte` (A §2 e §9) não têm par no B —
  e `.forte` é usada pela própria galeria no conceito B (`.tabela td.forte`,
  `sistema-b.css` §TABELA). Sem par, o nome do aluno na tabela sai em `--dim` no B.
  Proposta: `.forte` e `.topo-titulo` para `base.css` (tipografia/peso, sem cor),
  mantendo os ajustes de cor de cada sistema.
- `.logo-modo-dark`/`.logo-modo-light` (`sistema-b.css` §MARCA, linhas 247-254) são
  o par "DOM carrega os dois logos e o tema escolhe" — o A não tem a regra
  espelhada, então o mesmo `<a class="marca-sesi">` mostra **os dois logos** no
  conceito A. Atalho na tela: uma linha escondendo `.logo-modo-dark` no A.
  Proposta: portar o par para o `.marca-sesi` do A (mesma regra dos dois lados).

## 4. Centralização da última coluna da tabela (não é cor, é layout)

- **Onde:** `TabelaAlunos.tsx:52` faz a coluna "Crachá & Ações" com
  `style={{ textAlign: "center" }}` no `<th>` e no `<td>`. Os dois `.tabela` só
  conhecem `text-align: left` e a variante `.num` (direita).
- **Atalho na tela:** duas regras sem classe nova, escopadas no `data-tela`
  (`:is(th, td):last-child` + `justify-content:center` no `.linha` do `<td>`).
- **Regra proposta:** `.tabela th:last-child, .tabela td:last-child { text-align:center }`
  nos dois sistemas — ou uma variante `.tabela td.centro`/`.num--centro` para quem
  não quiser centralizar a última coluna por padrão.

## 5. Notas sem ação (só registro)

- **A tabela da aba Tabelas não desenha os controles de filtro** de propósito:
  `CrmApp.tsx:1088-1094` explica que busca/sala/estrelados/competência moram no
  estado do `CrmApp` mas os controles só são pintados na aba Portfólio — por isso
  a lista pode chegar vazia sem nada na tela explicando. A tela reproduz o estado
  vazio com `.eyebrow` "estado: filtro sem resultados" em vez de desenhar um
  filtro que a rota não tem. **Nenhum sistema precisa mudar aqui.**
- `.tabela-alunos`, `.badge-sala-tabela`, `.estrela`, `.tabela-sem-dado`,
  `.tag-habilidade-clean` são classes do app que **não** existem nos sistemas: por
  contrato não entram na tela. O que substitui cada uma está anotado no header
  da tela. Se a onda de correção quiser levar os nomes do app para dentro dos
  sistemas (fidelidade nome-a-nome), é decisão do coordenador, não uma dívida do
  desenho.
- A soma das estrelas do elenco é 95 (40+20+15+20 por sala, o que o CONTEUDO.md
  detalha); o "76 estrelas no total" do mesmo arquivo não fecha com o quadro de
  salas. A tela mostra só o número por aluno — nenhum total é exibido.

## 6. QA visual 02/10: tabela de 6 colunas estoura o container no B — P1-3 (hatch na tela)

- **Onde:** no B a `.tabela` é `width:100% + overflow:hidden`; com as 6 colunas
  da tela 05 (Redes ainda com `min-width: 16rem` inline no `<th>`), o layout
  auto comprimia a coluna do aluno até a bio quebrar 1 palavra por linha e a
  última coluna ("Crachá & Ações") sair cortada. O wrapper `.corte`
  (`base.css: overflow-x:auto`) já estava no DOM, mas sem piso de largura na
  tabela o scroll nunca tinha o que rolar.
- **Como a tela resolveu (hatch local, sem classe nova):**
  `.corte > .tabela { min-width: max(100%, 56rem) }` +
  `:is(th, td):first-child { min-width: 14rem }` (piso da coluna do aluno —
  o `minmax(220px,2fr)` do veredito é sintaxe de grid; aqui é `<table>`, o
  equivalente honesto é o min-width) + truncamento da bio
  (`.tabela .ocupada > small`, ellipsis em 34ch, string preservada no DOM).
- **Regra proposta:** levar ao B o par `.tabela { min-width: … }` dentro de
  `.corte` (ou `table-layout: fixed` com grid de colunas declarado por variante
  `.tabela--6col`) — e a truncagem de célula longa como utilitário
  compartilhado, fechando também a dívida 02 §5 (`.tabela-truncada` só no A).

## §Fix 02/10 (rodada 2) — tabela B cortada sem scroll

O piso de 56rem da tabela estourava `.wrap`/`.pilha` (flex items nascem com
`min-width:auto`) e o `overflow:hidden` do `.quadro` (sistema B) cortava — o
`.corte` nunca chegava a ter overflow, logo, sem barra. Fix no hatch:
`min-width:0` na cadeia `.quadro-corpo :is(.wrap,.pilha)`. Proposta p/ o
sistema: `.quadro-corpo > * { min-width: 0 }` nativo nos dois conceitos.
