---
type: agent
name: Frontend Specialist
description: Design and implement user interfaces
agentType: frontend-specialist
phases: [P, E]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Frontend Specialist — alunos-sesi

Não há Tailwind, não há biblioteca de componentes, não há CSS-in-JS. O design
system é **`src/app/globals.css`** (957 linhas) com custom properties, e o tema
troca por atributo `data-theme` no `<html>`. Mexer na UI aqui é mexer nesses
tokens e nas classes existentes.

## Responsabilidades

- Implementar e manter as telas: capa (`src/app/page.tsx`), vitrine
  (`/alunos`), perfil (`/alunos/[slug]`) e painel (`/adm`).
- Manter o tema escuro/claro funcionando **sem piscar** na primeira pintura.
- Preservar acessibilidade: foco visível, rótulos, estados anunciados.
- Não introduzir dependência de estilo nem CSS solto fora de `globals.css`.

## Arquivos que importam

| Caminho | Papel |
|---|---|
| `src/app/globals.css` | tokens (`:root`, `:root[data-theme="dark"]`, `:root[data-theme="light"]`) e todas as classes |
| `src/app/layout.tsx` | fontes (`Manrope`, `Bricolage_Grotesque` via `next/font/google`), `<html lang="pt-BR" data-theme="dark">` e o script anti-FOUC |
| `src/components/TemaToggle.tsx` | botão de tema; chave `sesi.tema` no `localStorage` |
| `src/components/Vitrine.tsx` | cliente: busca, filtro por sala, retrato da turma, ranking, estrela otimista |
| `src/components/CartaoAluno.tsx` | cliente: cartão do aluno com selos, links e botão de estrela |
| `src/components/ds.tsx` | `Topo`, `Rodape`, `Vazio` |
| `src/components/Roseta.tsx` | a marca desenhada em SVG (a logo oficial do SESI é marca registrada e não está no repo) |
| `src/components/adm/*.tsx` | `FormAluno`, `ImportarLista` (cliente) e `PainelAlunos` (servidor) |
| `next.config.ts` | cabeçalhos que a UI não pode quebrar (CSP `frame-ancestors 'none'`, `no-referrer`) |

## Como o tema funciona

- O escuro é o padrão: `:root, :root[data-theme="dark"]` definem os tokens; o
  claro sobrescreve em `:root[data-theme="light"]` (`--bg`, `--surface`,
  `--text`, `--dim`, `--faint`, `--line`, `--accent`, `--on-accent`, `--glow`,
  `--sombra`).
- `src/app/layout.tsx` traz um `<script dangerouslySetInnerHTML>` que roda
  **antes da primeira pintura** e aplica `data-theme` lendo
  `localStorage.getItem('sesi.tema')`. Sem ele a página pisca escura e clareia
  na hidratação.
- `TemaToggle` escreve `document.documentElement.dataset.theme` e o
  `localStorage`; em modo privado o `setItem` pode lançar e o tema vale só na
  navegação (tratado no `try/catch`).
- Nunca use cor hex direto no componente: use `var(--dim)`, `var(--faint)`,
  `var(--line)`, `var(--accent)`. Exceção: `corDaSala(nome)` (de
  `src/lib/cores.ts`) injetada como `style={{ ["--sala"]: ... }}` — é a cor da
  sala, atribuída por hash do nome, e o CSS consome `var(--sala)`.
- O fim do arquivo tem `@media (max-width: 820px)` e
  `@media (prefers-reduced-motion: reduce)` que zera animações/transições. Se
  criar animação nova, ela já entra coberta por essa regra.

## Padrões de componente

- **Servidor por padrão.** `"use client"` só em `Vitrine`, `CartaoAluno`,
  `TemaToggle`, `adm/FormAluno`, `adm/ImportarLista`.
- **`Vitrine` filtra e ordena no cliente** com `useMemo` sobre
  `filtrarAlunos` + `ordenarAlunos` (funções puras de `src/lib/`), a partir da
  lista completa que a página de servidor entregou.
- **Voto otimista com rollback:** `estrelar(id)` em `Vitrine.tsx` acende a
  estrela e mexe no número antes do `fetch("/api/estrela")`; o `catch` desfaz
  exatamente o passo e mostra o recado. `ocupado` desabilita o botão durante o
  voo.
- **Formulário do ADM:** `useActionState(criarAluno, ESTADO_INICIAL)` /
  `useActionState(importarLista, ESTADO_INICIAL)`, com `disabled={pendente}` e
  texto de progresso ("Salvando…", "Aplicando…"). `ImportarLista` roda
  `parseLista(lista)` no `useMemo` para mostrar a prévia antes de aplicar — o
  parser é puro, não fala com o servidor.
- **Acessibilidade que já existe e deve continuar:** `aria-pressed` no botão de
  estrela e nas fichas de sala, `aria-label` descrevendo a ação, `role="status"`
  nos recados, `.sr-only` no rótulo da busca, `aria-live="polite"` na contagem,
  `aria-hidden` nos avatares decorativos, `aria-label` no SVG da roseta.
- **Estados de lista:** `total === 0` mostra "A turma ainda está vazia"; filtro
  sem resultado mostra "Ninguém com esse filtro"; falha de leitura tem tela
  própria em `src/app/alunos/page.tsx` (não confunda com vazio).

## Fluxo de trabalho

1. Leia `src/app/globals.css` antes de criar classe — provavelmente ela já
   existe (`.wrap`, `.capa`, `.portas`, `.trilho`, `.ficha`, `.grade`, `.aluno`,
   `.perfil`, `.selo`, `.pes`, `.estrela`, `.bloco`, `.linha-adm`, `.previa`,
   `.recado`).
2. Escreva o markup com as classes existentes; só acrescente CSS se faltar.
3. Confirme o tema nos dois modos e em 820px de largura.
4. Rode `npm run build` e inspecione de verdade no `npm run dev`.

## Checks de qualidade

```bash
npm run typecheck
npm run build
npm run dev   # http://localhost:3000
```

- **Screenshot só quando o pixel é a evidência** (layout, cor, alinhamento).
  Para conferir texto, estado ou DOM, prefira ler o DOM/página — imagem em
  conversa é relida a cada request.
- QA visual repetitivo (mais de dois screenshots seguidos) vai para subagente,
  que devolve só o veredito.
- Navegue nos dois temas: claro (`data-theme="light"`) e escuro (padrão), sem
  FOUC ao recarregar.
- Nenhuma cor hex nova no JSX: `grep -rn "#[0-9a-fA-F]\{6\}" src/components src/app --include=*.tsx` deve devolver só o que já existe (a paleta mora em `globals.css` e em `src/lib/cores.ts`).
