# Dívidas · 17-galeria (galeria.html + index.html)

Achados de quem montou o inventário. Nenhum deles muda markup de conceito
(regra de ouro): são lacunas do sistema B que o `<style>/* no-sistema */` da
galeria contorna com tokens locais, e que a onda de correção deve portar para
`sistemas/sistema-b.css`.

## 1. sistema-b não define as peças do `.modal` (cabeca/corpo/rodape/x)

- **Onde:** `sistema-a.css` §10 define `.modal-cabeca`, `.modal-corpo`,
  `.modal-rodape`, `.modal-x`; `sistema-b.css` define só `.modal`,
  `.modal-caixa` e o h2 — no B o mesmo DOM (exigência do PADROES) sai sem
  layout: rodapé empilha, botão de fechar fica solto.
- **Atalho na galeria:** bloco `/* no-sistema */` com as quatro regras do B
  (flex + `--sp-*`/`--line-soft`/`--pouso`), idempotente se o port acontecer.
- **Regra proposta (para sistema-b, seção modal):**
  ```css
  [data-conceito="b"] .modal-cabeca { display:flex; align-items:center; gap:var(--sp-300); }
  [data-conceito="b"] .modal-x { margin-left:auto; width:36px; height:36px; display:inline-flex;
    align-items:center; justify-content:center; background:transparent; border:0;
    border-radius:var(--raio-md); color:var(--faint); cursor:pointer; }
  [data-conceito="b"] .modal-x:hover { background:var(--pouso); color:var(--text); }
  [data-conceito="b"] .modal-corpo { display:flex; flex-direction:column; gap:var(--sp-400); }
  [data-conceito="b"] .modal-rodape { display:flex; flex-wrap:wrap; justify-content:flex-end;
    gap:var(--sp-300); margin-top:var(--sp-500); padding-top:var(--sp-400);
    border-top:1px solid var(--line-soft); }
  ```
- **Impacto:** telas 02–09/11/14 usam modal; sem o port, cada uma precisará do
  mesmo escape hatch.

## 2. `.barra`/`.barra-fill` (progresso de insígnia) só existe no A

- **Onde:** `sistema-a.css` §20; sistema-b não tem par — mas o B é default de
  todas as telas e a escada de insígnias (80% da Alice) é conteúdo real.
- **Regra proposta:** trilho `var(--surface-3)`, fill `var(--accent)`,
  `.barra-ok` com `var(--ok-fg)`, mesma variável `--pct`.
- **Enquanto isso:** a galeria demostra o A e marca a ausência no `.eyebrow`.

## 3. Família `.campo` no B não tem rótulo/dica/erro de texto

- **Onde:** `.campo-label`, `.campo-dica`, `.campo-msg-erro` só no A; o B dá o
  erro pelo `aria-invalid` no controle, mas o texto de ajuda fica nu.
- **Regra proposta:** no B, `.campo-msg-erro { color:var(--perigo-fg); font-weight:700 }`
  e `.campo-dica { color:var(--faint) }` (o B da galeria usa `<small>` sem
  classe para não inventar cor).

## 4. Aliases de tokens do A aninhado (técnica do inventário)

- **Onde:** `galeria.html` precisa recriar os tokens de `:root[data-conceito="a"]`
  em `section[data-conceito="a"]` porque a página-mãe é B. Se o coordenador
  quiser canonicar, mover o bloco para um `sistemas/galeria-aliases.css` (ou
  para o próprio sistema-a sob `section[data-conceito="a"]`), e a galeria perde
  o no-sistema 1.

## 5. Notas sem ação

- `.btn--grande`/`.btn--icone`/`.btn--perigo-fantasma` são variantes do A; o B
  cobre os mesmos casos com `--pequeno`/padding — PADROES lista o contrato como
  `--pequeno/--full`, não é bug.
- `.hero-acoes` só no A (o B usa `.linha`); o inventário mostra as duas saídas.
- `moldura.js` injeta `href="../index.html"` na barra — no próprio hub isso
  aponta para fora de `design/`. Chrome congelado; registrar só se o coordenador
  tocar no moldura.js (fora do meu escopo).
