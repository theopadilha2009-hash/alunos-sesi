# Dívidas · 03-crm-projetos (telas/03-crm-projetos.html)

Lacunas de sistema que obrigaram escape hatch `<style>/* no-sistema */` nesta
tela. Regra de ouro respeitada: um só DOM, dois conceitos; nada aqui cria
markup exclusivo de um conceito.

## 1. `.quadro`/`.quadro-corpo` (layout CRM: sidebar + corpo) só existem no A

- **Onde:** `sistema-a.css` §15 define o par (`display:flex`, corpo
  `flex:1 1 560px`, coluna no mobile §21). O `sistema-b.css` define a
  `.sidebar` mas não tem o contêiner — a galeria contorna com
  `style="display:flex…"` inline no chrome de demonstração.
- **Necessidade:** toda tela CRM (02–07/09) precisa deste shell; sem o par no
  B, cada tela repetiria o hatch ou dependeria de style inline (o inline não
  cobre o `data-frame="mobile"`).
- **Regra usada na tela (portar para `sistema-b.css`, seção sidebar):**
  ```css
  [data-conceito="b"] .quadro { display: flex; align-items: stretch; min-height: 100%; }
  [data-conceito="b"] .quadro-corpo { flex: 1 1 560px; min-width: 0; display: flex; flex-direction: column; }
  [data-conceito="b"][data-frame="mobile"] .quadro { flex-direction: column; }
  ```
  (No mobile, o B já tem `.sidebar { width:100%; position:static }` — falta só
  o flex-direction no contêiner.)

## 2. Peças do `.modal` no B — reitera dívida 17 §1

- **Onde:** `.modal-cabeca`, `.modal-x`, `.modal-corpo`, `.modal-rodape` só em
  `sistema-a.css` §10. A tela 03 usa o modal do `ModalPerfilBreve` (estado
  aberto do "Perfil do Autor →") e carregou as mesmas quatro regras da galeria
  no hatch, idempotentes ao port.
- **Ação:** nenhuma nova regra — só registrar que a dependência agora é de
  duas páginas (03 e, na onda, 02/04–09/11/14). Quando o port para
  `sistema-b.css` acontecer, apagar o bloco 2 do hatch da tela 03.

## 3. DOM único dos dois logos vs. conceito A

- **Onde:** o B exige `<img class="logo-modo-light">` + `<img class="logo-modo-dark">`
  dentro de `.marca-sesi` (sistema-b §MARCA — "o DOM carrega os dois logos e o
  tema escolhe"). No A, `.marca-sesi img` não tem filtro nenhum: os dois logos
  empilham visíveis (o branco some no fundo claro mas ocupa 36px de altura).
- **Regra usada na tela:** `[data-conceito="a"] .logo-modo-dark { display:
  none; }` e inversão dentro de `.ilha-escura` do A (sempre o branco).
- **Proposta:** essas três regras pertencem ao `sistema-a.css` §14
  (`.marca-sesi`), espelhando o comportamento do B.

## 4. Rodapé da sidebar: `.sidebar-pe` (A) vs `.sidebar-rodape` (B)

- **Onde:** mesmo slot de "usuário logado + ações" tem dois nomes de classe.
  A tela usa `.sidebar-rodape` (nome do B, default das telas); no A o bloco
  sai sem o cartão `--surface-3` que `.sidebar-pe` dá.
- **Proposta:** no A, `.sidebar-rodape, .sidebar-pe { … }` como sinônimos (ou
  portar o visual do pe para o nome do B). Não usamos hatch para isso — a
  diferença é de polimento, não de layout quebrado.

## 5. Notas sem ação

- `.badge--num`, `.avatar--md`, `.cartao--interativo`, `.selo--suave` só têm
  par no B; `.cartao--clique` só no A. Usamos os dois nomes de clique juntos
  (`cartao--interativo cartao--clique`) para o DOM ser um só — as variantes de
  tamanho/cor restam degradação elegante onde faltam.
