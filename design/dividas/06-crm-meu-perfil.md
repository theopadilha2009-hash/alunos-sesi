# Dívidas · 06-crm-meu-perfil

Achados de quem desenhou a tela do Meu Perfil. Nenhum muda markup por conceito
(regra de ouro do PADROES): é um DOM só; o que falta no sistema está no
`<style>/* no-sistema */` da tela, com proposta de port abaixo.

## 1. `.aba` significa coisas opostas nos dois sistemas (o caso mais caro)

- **Onde:** `sistema-a.css` §7 trata `.aba` como o **botão** e `.aba-lista`
  como a régua; `sistema-b.css` §abas trata `.aba` como a **régua** (e estiliza
  ` .aba [role="tab"]` como botão) — inclusive a regra de sticky própria desta
  tela (`[data-tela^="06"] .aba`). Um DOM não consegue servir os dois nomes com
  semânticas trocadas sem um dos conceitos sair quebrado.
- **Como a tela resolveu:** régua `class="aba aba-lista"` + botão
  `class="aba-item"`. O B fica 100% nativo (`.aba` régua + `.aba button`); o A
  recebe no-sistema o espelho do seu `.aba` antigo em `.aba-item` e uma
  correção de `.aba.aba-lista` (borda/padding/margin que o `.aba` herdado
  sobrescrevia).
- **Regra proposta (onda de correção):** canonicar o DOM do B como contrato
  (`[data-aba-group] > .aba > button[role=tab]`, painel `.painel-aba`), renaming
  no sistema A: `.aba-lista` → `.aba`, `.aba` (botão) → `.aba-item`; ou então
  adicionar `.aba-item` aos dois sistemas como nome do botão.

## 2. O conceito B não tem o quadro do CRM (`.quadro`/`.quadro-corpo` só no A)

- **Onde:** `sistema-a.css` §15 define o par de layout sidebar+corpo; o B não
  tem nada equivalente (a galeria contorna com `display:flex` inline e por isso
  não reproduz o problema). Todas as telas 01–07/09 vão precisar.
- **Regra proposta (seção CRM de sistema-b.css):**
  ```css
  [data-conceito="b"] .quadro { display:flex; flex-wrap:wrap; align-items:stretch;
    min-height:70vh; border:1px solid var(--line); border-radius:var(--raio-lg);
    overflow:hidden; }
  [data-conceito="b"] .quadro-corpo { flex:1 1 560px; min-width:0; display:flex;
    flex-direction:column; }
  ```
- Enquanto isso vive no `/* no-sistema */` da tela.

## 3. Peças do `.modal` e `.barra` faltando no B (continua as dívidas 17 §1/§2)

- `.modal-cabeca/-corpo/-rodape/-x` e `.barra/.barra-fill` só existem no A; a
  tela 06 usa os dois (modal de recorte e a barra de 80% da insígnia
  "Queridinha da Turma"). Copiei exatamente as regras propostas em
  `dividas/17-galeria.md` §1/§2, escopadas ao B, no `/* no-sistema */`. Não
  duplicar a dívida: consolidar com a 17.

## 4. A nunca esconde o logo branco da `.marca-sesi`

- **Onde:** `sistema-b.css` troca `.logo-modo-light`/`.logo-modo-dark` por tema;
  o A não tem as duas regras, então um DOM com os dois logos (o que o B pede)
  mostra os dois lado a lado no conceito A.
- **Fix aplicado na tela:** `[data-conceito="a"] .logo-modo-dark { display:none }`.
- **Regra proposta:** essas duas linhas pertencem ao sistema A (§marca), não à
  tela.

## 5. Primitivos novos que a família não tem (proposta de entrada nos dois)

- `.ponto-status` — ponto de presença do avatar (o `hero-banner-status-dot` do
  app). O A tem `.badge--ponto` mas ele pinta `currentColor` dentro do badge;
  sobreposto ao avatar precisa de anel na cor do fundo (`border: 3px solid
  var(--bg)`), que remapeia certo dentro da `.ilha-escura` nos dois conceitos.
- `.recorte-janela` — moldura tracejada da área de recorte do modal. Não existe
  classe de "guia de crop" em lugar nenhum.
- `[data-conceito="a"] .ilha-escura { position: relative }` — o A não ancora
  posicionamento absoluto; sem isso os stickers do estúdio (`.olho` com
  `position:absolute`, exatamente como o app posiciona por %) voam para fora do
  herói.

## 6. `.avatar` do B escreve as iniciais em `--surface` — invisível no escuro

- **Onde:** `sistema-b.css` §avatar: `color: var(--surface)` sobre gradiente
  `color-mix(--cor-destaque 65%, var(--surface))`. No tema claro funciona; no
  escuro (e dentro da `.ilha-escura`) é tinta sobre tinta — o herói da tela 06
  saiu com o "AD" ilegível no primeiro render.
- **Fix aplicado na tela:** `[data-conceito="b"] .avatar { color: var(--text) }`
  no `/* no-sistema */`.
- **Regra proposta:** o B deveria calcular o contraste do avatar como calcula o
  do `.btn--primario` (fg derivado do bg), não fixar `--surface`.

## 7. `.marca-sesi small` só é bloco no B

- **Onde:** `sistema-b.css` define `.marca-sesi small { display:block }`; o A
  não tem par, e o DOM canônico da marca (dois logos + `<span>Nome<small>
  subtítulo</small></span>`, exigido pelo B) sai com o texto grudado no A
  ("AlunosEscola SESI" no primeiro render).
- **Fix aplicado na tela:** bloco equivalente no A via `/* no-sistema */`.
- **Regra proposta:** portar a regra para `sistema-a.css` §14 (marca).

## 8. Notas sem ação

- O modal de recorte foi deixado **fechado** com gatilho `data-abre`
  ("Trocar Banner"/"Recortar & Ajustar") em vez do `.modal-aberto` estático do
  PADROES §Abas/overlays: nesta tela o modal cobre o próprio objeto do
  screenshot, e o comando do workflow pede modal funcional via `data-*` — o
  *estado* aberto continua demonstrável (um clique) e fechável por Esc/`data-fecha`.
- `.btn--icone` é do A; no B o botão de ícone fica com padding padrão. Aceitável,
  mas se o contrato listar `--icone`, portar ao B.

## 9. Espelho das pontes §4 e §7 nas telas 10 e index — QA P1-5 (02/10)

- O hatch `/* no-sistema */` de `[data-conceito="a"] .logo-modo-dark { display:
  none }` e `[data-conceito="a"] .marca-sesi small { display: block; … }` foi
  repetido em `telas/10-vitrine.html` e no `<style>` novo de `index.html`
  (hub, que não tinha nenhuma regra local) — o veredito de QA marcou "Alunos
  Escola SESI" grudado na 10 e no hub; em A, sem o par, os dois logos apareciam
  lado a lado. Não é dívida nova: quando §4 e §7 forem portadas para
  `sistema-a.css` §14, esses dois hatches morrem junto.
- Nota do round: em **B+light** a marca some nas telas 06/10 — a regra canônica
  hoje é do sistema (`sistema-b.css` linhas do `.marca-sesi .logo-modo-*`:
  claro mostra o branco). Não é classe de tela; quem porta é o dono dos
  sistemas (registrado no report da onda, sem hatch para não brigar com ele).
