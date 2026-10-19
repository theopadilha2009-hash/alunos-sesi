---
name: direcao-visual-tabelas
description: O Frutiger Aero completo foi rejeitado no mesmo dia; a direção real do Théo é flat simples sem sombra — o padrão em .aba-tabelas/.tb-* para copiar nas próximas telas
metadata:
  type: project
---

# A direção visual da Tabelas & Alunos — Frutiger rejeitado, flat simples aprovado (19/10/2026)

Duas voltas no mesmo dia — registrar a LIÇÃO junto com o estado final.

**O que o Théo pediu primeiro**: "mais iPhone, bolha de vidro com cores reais,
tipo Frutiger Aero" (as 3 referências dele: iPhone, glassmorphism, Frutiger
Aero). Entreguei o Frutiger completo em `tabelas-2026.css` (então
`frutiger-2026.css`): céu de meio-dia de fundo, painéis com blur+saturação,
brilho especular, chips de sala como bolhas 3D com sombra colorida.

**O veredito dele ao ver no ar (PR #150):** "ficou demais agora, quero algo
bonito simples, esquece tudo, cores de verdade, nada de sombra e tal, coisas
simples como um cargo ali normal feito por um humano, nada de mais. Esse azul
não caiu bem. Esses cargos 3D foi foda num jeito ruim."

**A lição (para as próximas telas):** quando ele pede uma estética de
referência (glass, Frutiger, iOS), o que ele quer é a LIMPEZA daquela
referência, não o teatro — nada de sombra colorida, gradiente de fundo,
brilho especular ou chip com profundidade. Um chip "feito por um humano":
contorno quieto, cor de fundo chapada quando ativa, ponto final.

**O estado final (PR seguinte ao #150, mesmo dia):**

- O CSS é `src/app/styles/tabelas-2026.css`, escopado em `.aba-tabelas`
  (o wrapper da aba no CrmApp) — nenhum pixel fora da tela. As classes
  internas são `.tb-*` (`tb-filtros`, `tb-busca`, `tb-chip`,
  `tb-chip-ativo`, `tb-chip-sala`, `tb-contagem`).
- Zero sombra, zero gradiente, zero blur, zero transform. Painéis:
  `var(--surface)` + borda `var(--line)`. Cabeçalho é texto solto, sem caixa.
- Chip ativo neutro: fundo `var(--text)`, texto `var(--bg)` (preto no claro,
  claro no escuro). Chip de sala ativo: a cor da sala escurecida um passo
  (`color-mix(sala 78%, black)`) com branco por cima.
- Chip de sala NA TABELA: fundo lavado da própria cor (14%), ponto cheio,
  peso 700 — sem borda colorida nem sombra.
- Os filtros continuam e são LOCAIS da aba (`PainelTabelaAlunos.tsx`):
  busca sem acento, chips de sala, estrelados, fixados, com redes, contagem
  "X de Y". Locais de propósito — os da Portfólio já vazaram pra cá uma vez.

Quando o Théo aprovar espalhar o visual às outras telas, copie este padrão
(classe da aba + `.tb-*`), não o do Frutiger.
