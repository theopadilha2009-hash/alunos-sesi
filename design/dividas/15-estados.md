# Dívidas · 15-estados

Achados de quem desenhou os estados globais (`not-found.tsx`, `error.tsx`,
`global-error.tsx`, `ds.tsx Vazio` + a proposta de carregamento). Um DOM só, dois
conceitos; o que faltou nos sistemas está no `<style>/* no-sistema */` da tela,
com proposta de port abaixo. Rodou `bash design/scripts/verificar.sh` em
02/10/2026: gates 1, 2, 4, 5 e 6 limpos para esta tela (ver §6 para o gate 3).

## 1. Não existe primitivo de número de estado (o "404")

- **Onde:** `not-found.tsx:30-32` desenha o `404` em `3.5rem`/`800` na cor do
  acento, acima do título. O A tem `.metrica--gigante` (§16), mas é número de
  faixa escura (`--ilha-faint`, `--fs-gigante` até 12.5rem) — seria lido como KPI,
  não como código de estado. O B não tem gigante nenhum.
- **Como a tela resolveu:** `[data-numero-heroi]` no `/* no-sistema */`:
  `--fonte-titulo`, `3.5rem`, peso 800, `color: var(--accent)` (mesma cor do
  fonte, que usa `var(--accent)` e não a cor da sala).
- **Regra proposta:** entrada `.display-estado` (ou `.numero-estado`) nos dois
  sistemas — tamanho `clamp(var(--fs-800), 8vw, 4.5rem)`, `font-variant-numeric:
  tabular-nums`, cor `var(--accent)`. Consumidores: 15 (404), 13 (hash/selo),
  07 (contagem de pendências).

## 2. `<details>` é primitivo do app e não existe em sistema nenhum

- **Onde:** `error.tsx:48-65` — o bloco "Detalhes do erro (dev)" é um disclosure
  nativo com `background: var(--surface-2)`, `color: var(--vermelho)`,
  `word-break: break-all` e `summary` em peso 600. Nenhum dos dois sistemas tem
  regra para `details`/`summary`; sem nada, o print sai como texto solto.
- **Como a tela resolveu:** `[data-dev-details]` no `/* no-sistema */`, fiel ao
  fonte (o `summary` e o parágrafo de mensagem herdam o vermelho; o de `Digest:`
  desce para `--faint`, que é o que o fonte faz). Marrei o bloco aberto com
  `open` para o estado ser visível no print — no app ele entra fechado e só existe
  com `NODE_ENV=development`.
- **Regra proposta:** `.disclosure` + `.disclosure-summary` nos dois sistemas. O
  app tem `<details>` também em `PerfilInterativo.tsx` e no ADM; hoje cada um se
  vira com estilo inline.

## 3. Skeleton de mídia: `.skeleton--bloco` (A) e `.skeleton--cartao` (B) não se
encontram

- **Onde:** a mini-vitrine carregando precisa de um bloco de capa por card. O A
  define `.skeleton--bloco` (160px, `--raio-md`); o B define `.skeleton--cartao`
  (9rem, `--raio`). Nomes e alturas diferentes, e nenhum dos dois existe no outro
  conceito — no A, `--cartao` não tem altura nenhuma (colapsa a `min-height:
  14px`); no B, `--bloco` idem.
- **Como a tela resolveu:** só as variantes que os dois têm (`.skeleton--linha`,
  `.skeleton--titulo`, `.skeleton--circulo`, essas têm o MESMO nome nos dois) e,
  para a capa, `.skeleton` base com `height` inline. Não é dívida de markup
  duplicado — é de nomenclatura.
- **Regra proposta:** canonicizar `.skeleton--bloco` nos dois (altura
  `var(--sk-bloco-h, 9rem)`), aposentar `--cartao` como alias, e deixar claro qual
  é o par de "capa de card" (o `.olho` do base.css já é o placeholder carregado —
  o skeleton dele deveria ser o mesmo formato).

## 4. `.ilha-escura` impõe o filete de 4 cores até onde ele não significa nada

- **Onde:** `sistema-b.css` §ilha-pescura pinta `::before` com o gradiente
  ciano→verde→amarelo→vermelho-SESI em toda ilha. A assinatura marca peça
  oficial (crachá 09/11, NFC 12). O `global-error.tsx` é um card de falha: não é
  documento, não tem selo, não tem matrícula. No A não há filete, então a mesma
  ilha sai com cara de duas peças diferentes entre conceitos.
- **Como a tela resolveu:** `[data-glob-erro]::before { display: none; }` no
  `/* no-sistema */` — markup único, só o pseudo-elemento desligado.
- **Regra proposta:** `.ilha-escura--lisa` (ou `::before` só com
  `[data-oficial]`) nos dois sistemas, para a tela 15 e para qualquer bloco
  escuro que não seja credencial.

## 5. `.btn[aria-busy]` existe só no A (e o "Tentar Novamente" é justamente o
botão que re-tenta)

- **Onde:** `sistema-a.css` §3 define o spinner de 14px em
  `.btn[aria-busy="true"]::before`. O B trata `[disabled]`/`[aria-disabled]` com
  `opacity: .45` e não tem estado de processamento — o botão que chama `reset()`
  em `error.tsx:71` fica sem feedback no conceito B enquanto a rota recarrega.
- **Como a tela resolveu:** deixei `aria-busy` de fora do DOM (marcá-lo mostraria
  spinner no A e nada no B, que é exatamente a mentira que o contrato proíbe). O
  estado "carregando" da tela 15 é dito pelo skeleton, com `aria-busy="true"` no
  contêiner da mini-vitrine.
- **Regra proposta:** portar o spinner para `sistema-b.css` (mesmo gancho
  `[aria-busy="true"]`, `::before` com `currentColor` + `border-right-color:
  transparent`). Consumidores reais: `error.tsx`, `LoginTela.tsx`, o ADM que
  aprova projeto.

## 6. Nota de gate, não de sistema: os links da tela apontam para a 10

"← Ver a turma" (Topo, `not-found.tsx:7` / `error.tsx:76`) e "Explorar Alunos &
Portfólios" (`not-found.tsx:41`) vão para `/alunos`, que no showcase é
`10-vitrine.html`. O arquivo ainda não existe (a onda escreve as telas em
paralelo), então o gate 3 de `verificar.sh` acusa três links inexistentes nesta
tela — e na 12, que faz o mesmo. Fecha sozinho quando a 10 aterrissar; não troque
por `../index.html` na revisão, porque o hub não é a rota do app.
