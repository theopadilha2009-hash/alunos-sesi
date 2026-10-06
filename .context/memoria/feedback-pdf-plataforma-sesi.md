---
name: feedback-pdf-plataforma-sesi
description: As 23 anotações do PDF "Plataforma sesi (1)" (Théo, 06/10) — o que já fechou, o que é fix de design e o que é feature/decisão
metadata:
  type: project
---

Em 06/10/2026 o Théo mandou `~/Downloads/Plataforma sesi (1).pdf` (10 páginas,
capturas do app em produção com anotação à mão). São **23 anotações** — feedback
**anterior ao redesign** (fatias 1-8), então parte já morreu de tabela. Ele
pediu: "faz a primeira frente que você sabe, deixa os pendentes depois".

**Frente 1 (página 1) — FECHADA em 06/10:**
- ✅ **Matrícula e e-mail em 2 linhas** no mini-currículo A4 → **PR #94**. Causa:
  `.curriculo-contatos-grid` era `grid` de 2 colunas `1fr` (314px cada) e a
  matrícula (27ch) não cabia → virou `flex-wrap` + `white-space: nowrap`.
- ✅ **"bloco azul estranho" no crachá** → **PR #95**. Era `.cracha-cordao-presilha`
  (fita 44×24 com `linear-gradient(90deg,#38c7bd,#3b82f6,#38c7bd)`) acima do card.
  Removido do JSX e do CSS. O `cracha-furo` ficou (o showcase B também o desenha).
  O PNG exportado não mudou: `baixarCrachaPng` desenha do zero no canvas.
- ✅ **p8 "baixar PDF duplica as páginas"** → **PR #97**. A folha A4 abre DENTRO
  do `.crm-layout`; sidebar, main e o `.modal-perfil-breve` ficavam montados
  atrás e entravam no fluxo de impressão (5 páginas). Fix: `@media print {
  .crm-layout:has(.curriculo-folha-a4) > :not(.curriculo-modal-backdrop)
  { display: none } }` + backdrop `position: static` (fixed repetiria a folha
  por página). O `:has()` escopa — a impressão do **Catálogo** usa o mesmo
  `.crm-layout` sem currículo e seguiu igual (5 páginas, 17 linhas). Medido:
  1 página para os 17 alunos; a folha mais alta (Théo) = 749px de 1009px úteis.

**Página 1, ainda aberto:**
- **"botão de denúncia pra tudo"** — **feature nova**, não fix. Exige decisão
  (o que denunciar, para onde vai, quem vê) e schema. Não começar sem o Théo.

**Páginas 2-10 (pendentes, do Théo):** apagar faixa/banner do perfil (p2),
grade do Portfólio (p3), GIF sobre o texto (p3), logo→home (p4), "Meu Perfil"
como modal (p5), editar/apagar turmas no ADM + verde feio (p5), cargos/badges
feios (p6), não entendeu "Validar" (p7), chips quadrados (p7), dois "Lucas
Bento" (p7), botão "Banner do Perfil" vermelho/não clicável (p8), mover
sticker sobrepõe (p9), apagar salas menos 9 (p9), confete depois das
estrelinhas (p9), aba "em construção" (p10).

**O que a investigação de 06/10 achou (antes de o Théo decidir):**
- **p4 "logo → home"**: a marca da vitrine (`Topo`, `ds.tsx`) **já** linka para
  `/alunos`, com comentário explicando (a raiz `/` é o login do CRM). Pode ser
  ambíguo — a marca da sidebar do CRM (`CrmApp.tsx:440`) é `div`, não link.
- **p7 "quadrados horríveis"**: `.selo` já é pílula (`border-radius: 999px`);
  os quadrados são provavelmente `.nav-item` ou `.btn-alvo-opcao` (raio 8px) —
  precisa o Théo apontar.
- **p9 "confete depois das estrelinhas"**: `estrelar` (`CrmApp.tsx:362`)
  dispara o confete no clique, antes do servidor confirmar — de propósito
  (feedback imediato). Mover para depois do `ok` é decisão.
- **p8 "botão vermelho parece erro"**: `.btn-alvo-ativo` (`estudio.css:103`)
  usa `--vermelho-sesi` para o item SELECIONADO — o vermelho institucional
  virou cor de erro. Trocar para `--accent` casa com `.nav-item-ativo`, mas o
  claro tem "decisão 3" documentada (`claro-estudio.css`) sobre esse chip;
  mudar é decisão de design.

**Nota de leitura:** várias dessas podem ter sido cobertas pelas fatias 1-8
(chips = fatia 3, cargos = fatia 3, banner = fatias 6-7, modais/avatar = fatia 7).
As que são **dado ou funcionalidade** (dois Lucas, apagar salas, PDF duplicando,
botão de denúncia) o redesign não tocou. Ver [[design-showcase]] e
[[decisoes-sao-do-theo]].
