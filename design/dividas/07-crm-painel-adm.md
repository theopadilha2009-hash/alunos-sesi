# Dívidas · 07-crm-painel-adm (telas/07-crm-painel-adm.html)

Cinco peças desta tela fecham mal nos sistemas congelados. Nada aqui é markup de
conceito (regra de ouro do PADROES): é o mesmo DOM vestido pelos dois. As pontas
que a tela 02 já tinha aberto (`.quadro`, `.sidebar-*`/`.kbd`, `--cor` vs
`--cor-destaque`, `.chip-sala`) eu **repeti no hatch** — ver §6, não são dívida
nova.

## 1. `.aba` é o CONTAINER no B e o BOTÃO no A — um DOM não serve aos dois

- **Onde:** `sistema-b.css` §ABAS usa `[data-conceito="b"] .aba` como a régua
  (`display:flex; border-bottom`) e estiliza os filhos por `.aba button`.
  `sistema-a.css` §7 é o inverso: o container é `.aba-lista` e `.aba` é o botão
  com `border-bottom: 2px`. O PADROES §Abas prescreve `.aba` + `.painel-aba` para
  as 5 sub-abas do Painel ADM — que é exatamente onde os dois significados
  colidem.
- **Atalho na tela:** `.aba` aninhado em `.aba` (o que a tela 02 fez no
  segmentado Cards×Tabela): no B vira régua+pílulas corretos; no A o container
  ganha `padding`/`border-bottom` transparente e cada botão a própria régua de
  seleção — funciona, mas é coincidência, não contrato. Com 5 abas longas
  ("Gestão de Alunos & Destaques (10)") o `gap: var(--sp-400)` do A estoura os
  1.320px e o A não tem `overflow-x` na `.aba-lista`.
- **Regra proposta (nos dois sistemas):**
  ```css
  /* A: dar à .aba-lista o que o B já tem na .aba */
  [data-conceito="a"] .aba-lista { gap: var(--sp-200); overflow-x: auto; scrollbar-width: none; }
  /* B: aceitar o botão nomeado, para o DOM poder ser .aba > .aba-item nos dois */
  [data-conceito="b"] .aba .aba-item { color: var(--dim); }
  ```
  Ideal: um só par de nomes (`aba-lista`/`aba`) portado para os dois; enquanto
  isso, a tela documenta o aninhamento.

## 2. `.metrica`: o A estiliza `.metrica-label/-valor/-delta`, o B estiliza `b/span/small`

- **Onde:** `sistema-a.css` §16 (`.metrica` é só o flex: o cartão vem do
  `.cartao` por volta) × `sistema-b.css` (MÉTRICA: `.metrica` já é o cartão e
  pinta os filhos por seletor de elemento `b`, `span`, `small`).
- **Atalho na tela:** um DOM que os dois leem —
  `<span class="metrica-label eyebrow">` + `<b class="metrica-valor">` +
  `<small class="metrica-delta">`, e o `.cartao` colado no `.metrica`
  (`class="cartao metrica"`) para o A ter a moldura e o B não ganhar cartão
  duplo. Funciona nos dois, mas só porque `eyebrow` e `--fs-*` existem nas duas
  famílias; é costura, não contrato.
- **Regra proposta:** o B passa a estilizar `.metrica-label/.metrica-valor/.metrica-delta`
  (mantendo `b/span/small` como alias de compatibilidade) e o A ganha o cartão
  embutido em `.metrica` — aí `class="metrica"` sozinho resolve nos dois.

## 3. `.vazio--linha` — classe nova que o hatch criou (única desta tela)

- **Onde:** `PainelAdmIntegrado.tsx:455-462` renderiza o "nenhum resultado" do
  ADM como **uma linha dentro da tabela**: `<td colSpan=6>` com a frase e nada
  de ilustração. Os dois `.vazio` (A §12 / B ESTADOS) são `flex-direction: column`
  + `text-align:center` + `padding: var(--sp-800)`, e o `b` do B é `--fs-500` —
  virava uma faixa de ~280px de alto por uma frase de 60 caracteres, três ordens
  de grandeza acima do que o real mostra.
- **Atalho na tela:** `.vazio.vazio--linha` → linha, `justify-content:
  space-between`, texto à esquerda, padding `--sp-400/--sp-500`, `b` em
  `--fs-300` (só tokens/`var()`; nenhum valor de cor literal).
- **Regra proposta (nos dois sistemas):**
  ```css
  .vazio--linha { flex-direction: row; justify-content: space-between; text-align: left;
                  gap: var(--sp-400); padding: var(--sp-400) var(--sp-500); }
  .vazio--linha b { font-size: var(--fs-300); }
  ```
- **Impacto:** telas 05 (Tabelas & Alunos), 14 (ADM standalone) e 06, que têm o
  mesmo "0 linhas" de tabela.

## 4. `.btn--icone` só no A; `.btn--perigo-leve` só no B

- **Onde:** as Ações da tabela do ADM são botões de um ícone com `title`
  (`IconeCracha`/`IconeChave`/`IconeLixeira`, `PainelAdmIntegrado.tsx:540-586`).
  O A tem `btn-icone/btn--icone` (quadrado, `padding: 0`); o B não tem par — sem
  ele o botão de ícone no B incha com o `padding-inline` do `.btn`.
- **Atalho na tela:** `class="btn btn--icone btn--pequeno btn--secundario"` (ou
  `--fantasma`); no B o que segura o tamanho é o `--pequeno`.
- **Regra proposta:** portar `btn--icone` para o B e `btn--perigo-leve` para o A
  (o A só tem `--perigo`/`--perigo-fantasma`, e "excluir" em linha de tabela pede
  o meio-termo que o B já tem).

## 5. Não existe primitivo de "recado compacto de célula"

- **Onde:** no fonte a recusa da troca de turma e o código emitido moram DENTRO da
  célula que o ADM acabou de mexer (`PainelAdmIntegrado.tsx:1190-1198`, com
  `style` inline apertando o `.recado`; `adm.css:362-400` faz o mesmo para o
  `.adm-codigo-ativacao`). `.recado`/`.recado-erro`/`.alerta-banner` não existem no
  showcase — o equivalente mais próximo é o `.toast`, que é flutuante.
- **Atalho na tela:** `<small>` solto na célula (o B já estiliza
  `.tabela td small` em `--faint`/`--fs-200`; o A **não** — no A sai no corpo
  escuro da tabela) + o código de ativação numa `.ilha-escura` com `code`
  gigante via regra de elemento no hatch.
- **Regra proposta:** levar `[data-conceito="a"] .tabela td small` para o A e
  criar nos dois o `.recado--celula` (frase curta, `--fs-200`, `--perigo-fg`),
  que é o que as telas 05/07/14 precisam para mostrar a action recusando sem
  sair da linha.

## 6. Repetidas do hatch da tela 02 (não são dívida nova)

`.quadro`/`.quadro-corpo` no B, `.sidebar-marca`/`.sidebar-pe` no B e
`.sidebar-rodape`/`.kbd`/`.logo-modo-dark` no A, `--cor` do avatar no A e
`.chip-sala` — copiadas de `dividas/02-crm-portifolio.md` §1, §2, §3 e §6 para a
tela fechar sozinha. Quando o coordenador portar aquelas, o bloco
`/* no-sistema */` desta tela perde 10 das suas 18 regras; sobram só as desta dívida
(itens 1–4: `.vazio--linha`, a costura da `.metrica`, os ajustes de `.aba`/`code`).

## 7. QA visual 02/10: o código de ativação some no A — P1-4 (hatch na tela)

- **Onde:** a ponte do `/* no-sistema */` desta tela pinta
  `.ilha-escura code { color: var(--ilha-accent) }` — token que só existe no B
  (`sistema-b.css` §ilha). No A a declaração fica inválida, a cor cai no herdado
  da ilha (quase-branco) e o `SESI-7KQ2-M4VB` desaparece dentro da pílula clara
  que o `code` do A (`--surface-2`) desenha: no screenshot, "input branco sem
  texto".
- **Como a tela resolveu (hatch local, só no A):** regra seguinte, mais
  específica, devolvendo `color: var(--text)` ao code sobre o fundo da pílula —
  mesmo contrato de tinta do B (accent legível sobre o fundo próprio).
- **Regra proposta:** os tokens da ilha escura (`--ilha-accent`, `--ilha-bg`,
  `--ilha-dim`…) pertencem só ao B; enquanto o A não os tiver, nenhum hatch
  multi-conceito deve lê-los sem fallback — ou o A define `--ilha-accent` como
  alias de `--accent` no bloco `:root[data-conceito="a"]`.
