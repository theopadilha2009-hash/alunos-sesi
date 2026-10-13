---
name: auditoria-visual-16-telas
description: Auditoria visual das 16 telas do app (08-09/10/2026) — 60+ achados, entregável HTML, e os contrastes que o tema claro ainda não cobre
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

**Bug de verdade (não só visual): sticker do cartão público cai no lugar errado.**
`u/[slug]/page.tsx:121,286` escrevem `transform: rotate(...)` inline, que
**sobrescreve** o `translate(-50%,-50%)` do CSS (`cracha-digital.css:403`). O
Estúdio usa `translate(-50%,-50%) rotate(...)` (`StickerCanvas.tsx:699`) — logo a
posição pública ≠ a que o aluno escolheu. `.nfc-projeto-sticker` nem declara
transform. Some-se `z-index:5` do sticker sobre um hero sem z-index: ele cobre o
nome/selo.

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

Relacionado: [[feedback-pdf-plataforma-sesi]] (as 23 anotações que originaram parte
das fatias de design), [[design-showcase]] (Etapa 2 do port), [[decisoes-sao-do-theo]].
