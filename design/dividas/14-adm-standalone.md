# Dívidas · 14-adm-standalone (telas/14-adm-standalone.html)

Achados de quem redesenhou a rota `/adm` (painel standalone, sem sidebar). Nada
aqui exige markup de conceito — são lacunas dos sistemas contornadas com
`<style>/* no-sistema */` usando só `var()`/`color-mix()` dos tokens existentes.

## 1. `--cor-destaque` definido inline não alcança `.selo` (terceira tela repetindo o atalho)

- **Onde:** `dividas/05-crm-tabelas.md` §1 e a tela 07 já tropelaram o mesmo.
  Os aliases `--destaque-sala`/`--destaque-tag` (B) e `--accent`/`--accent-soft`
  (A) são resolvidos no `:root`, então `style="--cor-destaque: var(--ciano)"`
  na linha da tabela/os selos de sala não os alcança — o `var()` da declaração
  congela no `:root`.
- **Atalho na tela:** `.selo--sala` local (mesma regra proposta em 05: deriva
  borda/fundo/texto de `--cor-destaque`). A tela usa em 13 linhas (fila + painel).
- **Regra proposta (portar para os dois sistemas, junto da família `.selo`):**
  a regra de 05 §1, literal. Com 05/07/14 repetindo, isto deixa de ser
  preferência de tela e vira bug do contrato: o `cores.ts` do app não tem para
  onde apontar.

## 2. Conceito A não conhece o par `.logo-modo-light` / `.logo-modo-dark`

- **Onde:** o DOM do showcase carrega os dois logos (como o app público) e o
  tema escolhe — isso só existe em `sistema-b.css:247-254`. No A, os dois `<img>`
  apareceriam lado a lado, e o `<small>` da marca (Escola SESI) fica sem estilo.
  01/05/07/09/12 cada um escondeu localmente (`[data-conceito="a"] .logo-modo-dark
  { display: none }`) — cinco telas copiando a mesma linha.
- **Atalho na tela:** as duas regras no `/* no-sistema */` (esconder a logo
  branca no A + estilizar `.marca-sesi small` como o B).
- **Regra proposta (sistema-a.css §14):**
  ```css
  [data-conceito="a"] .marca-sesi .logo-modo-dark { display: none; }
  [data-conceito="a"] .marca-sesi small { display: block; font-size: var(--fs-100);
    font-weight: 700; letter-spacing: var(--tracking-micro); text-transform: uppercase; color: var(--faint); }
  ```
  O nome da classe é confuso (`modo-light` é a que aparece no **tema escuro**
  do B) — na portada, vale renomear com alias, não quebrar as telas.

## 3. Não existe família inline de status/erro de formulário (`.recado`/`.erros` do app)

- **Onde:** `ImportarLista.tsx:95-114` mostra um recado (`role="status"`) e uma
  lista de erros numerados **dentro do cartão**, não num canto flutuante. Os
  sistemas só têm `.toast` (A o fixa via `.toast-area`, B é chrome de notificação)
  e nenhuma lista de erro. `.badge`/`.vazio` não comportam "linha 6: sem nome — {texto bruto}".
- **Atalho na tela:** o recado veste `.toast toast--ok` parado (inline); as duas
  listas (prévia e erros do parse) usam `ul[data-lista-erro]` com ganchos por
  atributo — sem classe nova nos sistemas — e `code` local com tokens.
- **Regra proposta:** componente `.recado` (bloco inline, variantes ok/aviso/erro
  derivadas de `--ok-bg`/`--aviso-bg`/`--perigo-bg`) + `.lista-erros` (linhas
  `linha N: motivo — texto`) nos dois conceitos. A rota 07 (CRM) vai bater na
  mesma parede; melhor padronizar agora.

## 4. `.metrica` é card demais para a prévia de 3 números

- **Onde:** a prévia do app (`.previa`: `<b>n</b><span>rótulo</span>` em três
  células compactas) vira três `.metrica`, que no B carregam `background`,
  `border`, `raio` e `--fs-700` no número — a régua de 3 números do importador
  pesa visualmente como KPI de painel.
- **Atalho na tela:** nenhum — aceitei o peso; o gate de fidelidade pede a
  classe existente, não invento variante sem registro.
- **Regra proposta:** `.metrica--compacta` (sem fundo/borda, número em `--fs-500`)
  nos dois sistemas. Usos futuros: retrato de turma, hall da fama, prévia de import.

## 5. Menor: `.forte` do B só casa com o próprio `td`/`td b`

- **Onde:** `sistema-b.css:836` (`td.forte, td b`). O nome do aluno é um link
  com `.forte` **dentro** do `td` → peso só via A (`.tabela .forte` descendente).
- **Atalho na tela:** uma linha no `/* no-sistema */` (`.tabela td .forte`).
- **Regra proposta:** trocar `td.forte` por `td .forte` no B (ou aceitar o
  descendente junto), alinhando com o A.
