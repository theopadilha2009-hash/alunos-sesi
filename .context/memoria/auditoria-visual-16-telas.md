---
name: auditoria-visual-16-telas
description: Auditoria visual das 16 telas (08-09/10/2026) — 60+ achados; em 15-16/10 fecharam o sticker do cartão e parte do contraste do claro, e o "ícone invisível" do ADM se provou falso
metadata:
  type: project
---

Em 08/10/2026 o Théo pediu "debug geral, revisar e me trazer um HTML com melhorias
visuais que podemos fazer no sistema", com até 16 subagentes e o resultado
**humanizado, sem jargão**. Feito: 16 frentes read-only (uma por tela/domínio),
capturas reais via Playwright, entregável em
`~/Downloads/auditoria-visual/melhorias-visuais.html` (auto-contido, 17 blocos,
17 imagens em `capturas/` ao lado). 60+ achados. **Nada foi editado no `src/`** —
é só diagnóstico; nenhum PR saiu disso.

**Classe de defeito que mais se repetiu: token de tema escuro consumido no claro.**
O `--amarelo` (#f3b544) e o `--vermelho-sesi` (#e30613) são tokens NEUTROS (feitos
para fundo escuro); sobre `--surface` branco dão ~1,9:1 e ~3,7:1. O `claro-crm.css`
já corrigiu esse par em vários pontos, mas **escaparam**:
- `.numero b` (métrica de estrelas da vitrine) — `var(--amarelo)` inline no
  `Vitrine.tsx:251`; nenhum `claro-*.css` alcança inline. ~1,9:1.
- `.adm-header-badge`, `.toggle-destaque-ativo`, `.pill-pendente` (ADM) — amarelos.
- `.validar-sigla` (cartão NFC) — usa `--vermelho-sesi` onde existia
  `--vermelho-sesi-texto` (#ff6666, o par AA do escuro) pronto.
- `.hall-sala` (pódio da vitrine) — cor de sala crua, sem o mix 55% com `--text`
  que `.aluno-sala` (`vitrine.css:349`) já usa. Mesmo dado, contraste diferente.
- `.metrica-icone-wrap` (ADM) — `rgba(255,255,255,0.08)`, branco sobre branco: o
  1º card de métrica fica SEM ícone no claro.
- `.estudio-topo`/`.btn-preset-card:hover` — `rgba(255,255,255,.08/.3)`, somem no claro.

**Bug de verdade (não só visual): sticker do cartão público caía no lugar errado.**
`u/[slug]/page.tsx:121,286` escreviam `transform: rotate(...)` inline, que
**sobrescreve** o `translate(-50%,-50%)` do CSS (`cracha-digital.css:403`). O
Estúdio usa `translate(-50%,-50%) rotate(...)` (`StickerCanvas.tsx:699`) — logo a
posição pública ≠ a que o aluno escolheu. **FECHADO em 15/10/2026 (PR #122):** o
par inteiro passou a ser inline nos dois pontos, espelhando o Estúdio, e o
`transform` do CSS da `.nfc-sticker-item` saiu (era inerte sob o inline).
Medido: 32px fora (meia-largura) → 0,0px. `tests/sticker-posicao.test.mjs` trava
a invariante. **O `z-index:5` sobre o texto NÃO é bug:** o Estúdio empilha igual
(`.sticker-overlay-item` z-index 10 sobre `.preview-hero-inner` z-index 2) — é o
desenho, o aluno vê o sticker por cima e escolhe assim. Não mexer.

**Outros achados de peso:** tabela do CRM empurra estrela/crachá para fora da tela
em 1440px (`minWidth:16rem` no th de Redes); erro promete "equipe notificada" sem
monitoramento ligado; skeletons de `loading.tsx` não têm a forma das rotas reais;
sidebar do CRM vira bloco empilhado no celular (sem drawer); escala tipográfica
existe mas 397 `font-size` literais a ignoram (24 raios distintos, 4 sistemas de
botão).

**Pegadinha de QA que custou uma rodada:** o script de captura gravava
`localStorage["sesi-tema"]`, mas o app lê **`sesi.tema`** (`src/lib/tema.ts:13`).
A captura "escura" saiu clara e passou batido — só foi pega porque um subagente
comparou a luminância com a captura clara (230,8 vs 19,9 depois do fix). Ao forçar
tema em QA, usar a chave real e conferir `document.documentElement.dataset.theme`.

**Contraste do tema claro — fechado em parte (15-16/10/2026).**
O Théo pediu "os que você achar bom" e eu corrigi os pontos onde a **resposta já
existia no código** (nenhum token novo):

- `.validar-sigla` (PR #123): usava `--vermelho-sesi` (#e30613). O `/validar/[slug]`
  é ilha escura nos DOIS temas, então o vermelho cru reprovava em ambos —
  **3,64:1 → 6,22:1** com `--vermelho-sesi-texto` (#ff6666), o par que o `.nfc-*`
  já usa. Não foi só o claro: melhorou o escuro também.
- `.hall-sala` (PR #123): pintava a cor CRUA da turma; adotou o `color-mix(... 55%,
  var(--text))` que o `.aluno-sala`, 13 linhas acima no mesmo arquivo, já fazia —
  3,81:1 → 7,88:1.
- Amarelos de texto (PR #124): `.numero b` (cor inline no `Vitrine.tsx`, que nenhum
  `claro-*.css` alcançava — movida para o `vitrine.css`), `.adm-header-badge`,
  `.pill-pendente`, `.toggle-destaque-ativo`, `.toggle-pendente-ativo`. Usam o
  `color-mix(in srgb, var(--amarelo) 42%, var(--text))` que o `claro-vitrine.css`
  já empregava: 1,83 → 6,64; 1,74 → 6,34; 1,52 → 5,52.

**CORREÇÃO À AUDITORIA — o "ícone invisível" do 1º card de métrica não existe.**
A auditoria dizia que o 1º `.metrica-icone-wrap` (sem tint inline, ao contrário
dos outros três) fica "SEM ícone no claro". Medido com Playwright no ADM (sessão
forjada): o ícone está em **17,85:1** (rgb(15,23,42) sobre branco) — visível. O
que é invisível é só o **quadrado de fundo** do ícone (branco sobre branco, 1:1).
O ícone não some; no máximo o quadrado é inconsistente com os irmãos, e isso é
escolha de cor. **Não mexi** — e ninguém deve "consertar" o ícone.

**O que sobra do contraste (escolha de cor, não fix):** outros `color: var(--amarelo)`
em `crm.css`/`vitrine.css`/`vitrine-moderno.css` (~20 no total), alguns dentro de
**ilhas escuras intencionais**. Antes de mexer, checar se é papel ou ilha — a
receita do claro é `color-mix(... 42%, var(--text))`; a do escuro é o amarelo cru.

Relacionado: [[feedback-pdf-plataforma-sesi]] (as 23 anotações que originaram parte
das fatias de design), [[design-showcase]] (Etapa 2 do port), [[decisoes-sao-do-theo]].
