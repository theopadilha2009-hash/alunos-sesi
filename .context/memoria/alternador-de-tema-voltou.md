# O alternador de tema voltou (PR #147, 19/10/2026)

O Théo mandou o design de referência do "Dashboard V14" pelo WhatsApp e pediu:
troca de tema cobrindo a tela como tinta a partir do botão, e números que
contam em vez de carregamento seco.

A decisão R1 (que tinha travado o app no claro e matado o tema salvo) foi
atualizada, não desfeita: a chave antiga do `localStorage` continua morta e
nenhum valor órfão de visita antiga é reaplicado. O alternador escreve em
`sesi.tema.v2`, chave NOVA, aplicada por script inline no `<head>` antes do
primeiro paint. Quem nunca clicou fica no claro.

Como funciona:

- A tinta é a View Transitions API (`document.startViewTransition`) com
  clip-path circular animado no `::view-transition-new(root)` —
  `src/lib/tema.ts` + `src/app/styles/animacoes-2026.css`. 500ms, easing do
  design system. Sem a API (Firefox < 144) ou com `prefers-reduced-motion`:
  troca direta.
- O ícone do botão é o tema de DESTINO (lua no claro, sol no escuro),
  decidido por CSS via `[data-theme]` — zero estado React, zero mismatch.
- `NumeroAnimado` (`src/components/NumeroAnimado.tsx`) conta do zero quando o
  valor entra na tela (IntersectionObserver) e do valor anterior quando ele
  muda. Aplicado nas métricas do painel ADM, vitrine, Meu Perfil, perfil
  público e crachá NFC. De FORA de propósito: contadores de filtro da vitrine
  (cada tecla dispararia contagem) e as estrelas dos cards (dezenas de
  observers de uma vez).
- O login segue ilha escura (pedido anterior do Théo, `ilhas-2026.css`); em
  dark global ela herda o tema sem conflito.

Verificado com Chrome headless contra o dev server: clique → página em dark,
`sesi.tema.v2` gravado, zero erros de console. O "gosto" da tinta em si o
Théo valida rodando (não é capturável em screenshot estático).
