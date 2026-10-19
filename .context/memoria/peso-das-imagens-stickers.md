---
name: peso-das-imagens-stickers
description: O "pesado" de 16/10 tinha causa real — GIFs do Giphy em tamanho original desenhados a 44px; e por que o Resource Timing não mostrava isso
metadata:
  type: project
---

Em **16/10/2026** o Théo mandou um print do **modal de perfil** (o "Meu Perfil")
com `/otimizar-app em tudo e nesse também` — e **aqui a queixa era verdadeira**,
ao contrário da de 13/10 ([[tabela-corte-e-o-falso-peso]]).

**O que NÃO era:** servidor. TTFB 117–132 ms nas quatro rotas, `x-vercel-id:
gru1::gru1` (função e banco na mesma região), sem servidor local rodando, disco ok.

**O que era:** imagem. Abrir "Meu Perfil" baixava **5,9 MB**, dos quais **5,6 MB
só de `media.giphy.com`** — os 5 GIFs da galeria de presets vinham no **original**
do Giphy e são desenhados a **44 px** (`.preset-thumb`). O "Retro Arcade"
(`3oKIPnAiaMCws8nOsE`) tem **2,3 MB** para aparecer do tamanho de um selo.

**A pegadinha do instrumento (lição durável):** a primeira medição não viu nada
disso. Imagem cross-origin **sem `Timing-Allow-Origin`** reporta `transferSize` e
`decodedBodySize` **0** no Resource Timing — o peso fica invisível num dump de
recursos, e a tabela "top recursos" só mostra JS e CSS. Foi preciso medir cada
`<img>`/`background-image` do DOM e pedir o `Content-Length` por fora (HEAD).
Vale para qualquer app com mídia em CDN de terceiro.

**O fix (PR #126, `perf:` medido):** trocar **só a rendição** — `/200.gif` é o
MESMO GIF a 200 px (≥4× o thumb, ≥2,8× o sticker padrão de 70 px), invisível na
tela. Mudou o `PRESETS_STICKERS` e uma migration (**021**) que reescreve os
stickers **já salvos**. Dos 17 alunos, **só o `theo-padilha` tinha stickers** (3).

- Medido, prod↔prod, imagens do modal: **5925,0 KB → 2938,4 KB (−50%)**.
- Cartão público `/u/theo-padilha`: **~3,0 MB → ~1,1 MB** de stickers.

**A armadilha da migration:** a variante `200.gif` **não existe para todo id** —
`unQ3IJU2RG7DO` responde **404** nela e teve que continuar no original. Por isso a
021 traz a **lista explícita** de ids conferidos por `curl`, e o mesmo cuidado está
no `PRESETS_STICKERS`.

**O que sobrou:**
- `/100.gif` cortaria mais (**−77%**), mas a 100 px um sticker **ampliado** além
  disso (o teto é `LIMITES_STICKERS.tamanhoMax` = 320 px) fica mole — fora do
  "sem mudar o visual". Trocar é `200`→`100` nos dois lugares.
- **Banner e foto em data URL** (2 alunos): inline base64 no HTML, não cacheável
  nem otimizável. A `midia.md` já migrou galeria/capa para o Blob; foto/capa/sticker
  ficaram data URL de propósito (teto de 4 MB do POST). Migrar é outra frente.
- Os `3oKIPnAiaMCws8nOsE` (719 KB) e `3o7btPCcdNniyf0ArS` (1165 KB) a 200 px ainda
  são os dois maiores do modal.

**19/10/2026 — o mesmo buraco no outro caminho, agora medido em CPU.** O Théo
tornou a achar o modal "bem lagado". Bench de runtime na `/u/theo-padilha`
(prod↔prod, mediana de 3 runs, `runtime-bench.mjs`) mostrou o que a medição de
16/10 não olhava: **CPU do Chrome parada a 32% só decodificando/pintando GIFs**
(a main thread estava livre a 0,4% — o custo mora no raster, não no JS). Os 3
stickers dele tinham escapado da 021 por dois caminhos: o `unQ3IJU2RG7DO`
continuava no **original** (o 404 da `200.gif`) e os outros dois estavam em
`200.gif` — o "Retro Arcade" era **736 KB** animando no **banner** do crachá,
para renderizar a 70 px.

- Fix por query de dado (3 stickers → `200w.webp`), medido em 4 pontos:
  topo **32,1% → 15,4% (−52%)**, meio 14,2% → 7,3% (−49%), rolando 28,9% → 18,2%.
- **A rendição barata do Giphy para sticker é `200w.webp`, não `200.gif`**:
  webp animado decodifica mais barato que GIF (o ganho de CPU veio mais do
  formato que da área — 200w manteve o topo melhor que 100w). E `200w` (width
  200) respeita o teto de 320 px do editor, que descartou o 100 na 021.
- Custos residuais medidos: ~15% de CPU parada é o preço de existirem
  stickers animados; **banner e foto do Théo em data URL (~200 KB de base64
  por navegação)** seguem como frente de bytes à parte.
- **Preventivo que falta:** o campo de sticker/projeto aceita a URL `giphy.gif`
  original sem normalizar para rendição — quem colar o link inteiro do Giphy
  recoloca o peso. Normalizar no salvar (ou na leitura) é fix futuro pequeno.
- Os SQLs dos fixes ficaram fora do repo (dado pontual, reversível por
  replace inverso); os assets conferidos: `unQ3IJU2RG7DO/200w.webp` (72,8 KB),
  `10bKPDUM5H7m7u/200w.webp` (37,6 KB), `3oKIPnAiaMCws8nOsE/200w.webp`
  (356,1 KB) — todos 200 OK por `curl -I` antes do UPDATE.
