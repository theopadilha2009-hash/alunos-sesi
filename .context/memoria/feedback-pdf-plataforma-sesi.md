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

**Página 1, ainda aberto:**
- **"botão de denúncia pra tudo"** — **feature nova**, não fix. Exige decisão
  (o que denunciar, para onde vai, quem vê) e schema. Não começar sem o Théo.

**Páginas 2-10 (pendentes, do Théo):** apagar faixa/banner do perfil (p2),
grade do Portfólio (p3), GIF sobre o texto (p3), logo→home (p4), "Meu Perfil"
como modal (p5), editar/apagar turmas no ADM + verde feio (p5), cargos/badges
feios (p6), não entendeu "Validar" (p7), chips quadrados (p7), dois "Lucas
Bento" (p7), PDF duplica páginas (p8), mini-currículo na mesma linha (p8),
botão "Banner do Perfil" vermelho/não clicável (p8), mover sticker sobrepõe
(p9), apagar salas menos 9 (p9), confete depois das estrelinhas (p9),
aba "em construção" (p10).

**Nota de leitura:** várias dessas podem ter sido cobertas pelas fatias 1-8
(chips = fatia 3, cargos = fatia 3, banner = fatias 6-7, modais/avatar = fatia 7).
As que são **dado ou funcionalidade** (dois Lucas, apagar salas, PDF duplicando,
botão de denúncia) o redesign não tocou. Ver [[design-showcase]] e
[[decisoes-sao-do-theo]].
