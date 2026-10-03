# PADRÕES — contrato do showcase (CONGELADO antes das telas)

Este arquivo é a lei do `design/`. Quem constrói tela NÃO edita sistemas, telas
alheias, `src/` nem `public/`. Divergir daqui = reprovar no `scripts/verificar.sh`.

## Regra de ouro

**Uma tela = um arquivo = um DOM.** Os dois conceitos (A e B) vestem o MESMO markup;
a diferença entre eles é 100% CSS escopado. Se você sentiu necessidade de markup
"só do A", o problema é do sistema — registre em `design/dividas/NN-<tela>.md` e
siga com o escape hatch (abaixo), nunca com `<div>` de conceito.

## Estrutura

```
design/
  index.html                    hub (17 cards + painel de dívidas)
  PADROES.md / CONTEUDO.md      este contrato + elenco fixo
  sistemas/
    base.css                    reset + primitivos estruturais (não tem cor)
    sistema-a.css               conceito A: tokens + componentes [data-conceito="a"]
    sistema-b.css               conceito B: tokens + componentes [data-conceito="b"] (dark+light)
    moldura.css / moldura.js    barra A|B|tema|frame, tabs/modais por data-*, sem engine
  componentes/galeria.html      inventário visual das classes (referência de uso)
  telas/NN-*.html               as 16 telas
  dividas/NN-<tela>.md          achados de quem desenhou (1 arquivo por agente)
  scripts/verificar.sh          gates
```

## Estado (atributos no `<html>`) e URL

- `data-conceito="a" | "b"` (default nos arquivos: `b`)
- `data-theme="dark" | "light"` — só o conceito B tem os dois; o A é claro e
  ignora o atributo
- `data-frame="desktop" | "mobile"` — mobile estreita o `.palco` a 390px (CSS, sem
  iframe)
- `moldura.js` lê e persiste os três em `localStorage` (`sesi.showcase.*`) **e**
  aceita query string (`?conceito=a&tema=light&frame=mobile`) — é assim que o
  screenshot headless captura um conceito específico.

## Esqueleto obrigatório de tela

```html
<!doctype html>
<html lang="pt-BR" data-conceito="b" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>02 · Portfólio (CRM) — Redesign alunos-sesi</title>
<!-- fontes: Google Fonts com fallback (Plus Jakarta Sans p/ A; Bricolage Grotesque
     + Manrope p/ B) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Manrope:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../sistemas/base.css">
<link rel="stylesheet" href="../sistemas/sistema-a.css">
<link rel="stylesheet" href="../sistemas/sistema-b.css">
<link rel="stylesheet" href="../sistemas/moldura.css">
<script>try{var d=document.documentElement;if(localStorage.getItem('sesi.showcase.conceito'))d.dataset.conceito=localStorage.getItem('sesi.showcase.conceito');if(localStorage.getItem('sesi.showcase.tema'))d.dataset.theme=localStorage.getItem('sesi.showcase.tema');if(localStorage.getItem('sesi.showcase.frame'))d.dataset.frame=localStorage.getItem('sesi.showcase.frame')}catch(e){}</script>
<!-- fontes reais desta tela (para o gate de fidelidade):
     src/components/crm/CrmApp.tsx:690-973; src/components/TopProjetosTurma.tsx -->
</head>
<body>
<div class="palco">
  <main class="tela" data-tela="02-crm-portifolio">
    <!-- conteúdo -->
  </main>
</div>
<script src="../sistemas/moldura.js" defer></script>
</body>
</html>
```

## Classes — o que você pode usar

- `base.css`: `.palco .tela .wrap .grade .linha .pilha .sr-only .olho`
- `moldura.css`: `.barra-showcase` e afins (a barra é injetada pelo JS; você não
  escreve markup dela)
- `sistema-a.css`/`sistema-b.css` **mesmas classes nos dois**: `.btn`
  (`--primario/--secundario/--fantasma/--perigo/--pequeno/--full`), `.campo`,
  `.chip` (com `[aria-pressed]`), `.cartao`, `.aba` + `.painel-aba`
  (`data-aba-group`/`data-aba`), `.selo`, `.badge` (`--ok/--aviso/--perigo/--info`),
  `.tabela`, `.modal` (`.modal-aberto`), `.toast`, `.vazio`, `.skeleton`,
  `.topo`, `.rodape`, `.marca-sesi`, `.sidebar`, `.metrica`, `.hero`, `.eyebrow`,
  `.avatar`, `.pill-list`
- **Referência viva do uso**: `design/componentes/galeria.html` — se a classe não
  está lá nem nos sistemas, ela não existe.

### Escape hatch (falta de classe)

Precisou de algo que o sistema não tem? `<style>/* no-sistema */ …</style>` no fim
do `<head>`, usando **só `var()`/`color-mix()` dos tokens existentes** (nunca hex
literal), e registre em `design/dividas/NN-<tela>.md` a regra proposta e por quê.
O coordenador consolida na onda de correção.

## Conteúdo

- **Pessoas e dados**: exclusivamente o elenco de `CONTEUDO.md` (fixo, igual em
  todas as telas — o showcase conta uma história coerente).
- **Strings de UI**: copie do arquivo-fonte da tela (rótulos de botão, títulos,
  mensagens de vazio/erro, placeholders, tooltips) — ≥8 strings reais por tela,
  declaradas no header de comentário. Não parafraseie o app.
- **Logos/marca**: `../../public/logo-sesi.png` (clara) e
  `../../public/logo-sesi-branco.png` (sobre fundos escuros), `alt="SESI"`. Nunca
  redesenhar a roseta em SVG/texto.
- **Imagens de conteúdo** (capas, avatares, banners): placeholders CSS com
  gradientes derivados dos tokens (padrão em `galeria.html`), nunca URL externa.
- **Ícones**: SVG inline com `stroke="currentColor"` (estilo lucide, viewBox 24,
  stroke-width 1.8). Cor via `currentColor` — sem hex.

## Proibições

- Hex/`rgb(a)` literal em qualquer tela (fora dos comentários de header e do
  `<style>/* no-sistema */`, que também não pode ter hex).
- ES modules (`type="module"`), `import`, `fetch`, iframe, `<form>` que submeta
  para algum lugar (use `onsubmit="return false"`/botões estáticos).
- Editar qualquer arquivo além do seu + seu `dividas/NN-*.md`.
- Copiar layout de outra tela sem ser o padrão (sidebar CRM só nas telas 01–07/09;
  `Topo/Rodape` públicos só em 10–16).

## Orçamento e idioma

≤ 1.200 linhas por tela. PT-BR. Quando estourar: encurte variações de estado, não
a fidelidade; e se ainda assim não couber, registre em `dividas/` (o coordenador
divide em âncoras na mesma página, nunca em arquivo novo).

## Abas, overlays e estados

- Tabs internas (ex.: as 3 do login, as 6 do Meu Perfil, as 5 do Painel ADM)
  vivem NO MESMO arquivo com `data-aba-group`/`data-aba` — `moldura.js` cuida do
  troca-troca com `aria-selected`.
- Modal: um `.modal.modal-aberto` estático no fim da tela (o estado aberto, não o
  gatilho) — exemplo na galeria.
- Estados (vazio, erro, carregando): cartões `.vazio`/`.skeleton` lado a lado com
  rótulo `.eyebrow` dizendo qual é, quando a tela os tem de verdade.

## Tela → fonte real (fidelidade obrigatória)

| Tela | Arquivos-fonte (ler antes de desenhar) |
|---|---|
| 01-login | `src/components/crm/LoginTela.tsx`, `src/components/TemaToggle.tsx`, `src/app/page.tsx` |
| 02-crm-portifolio | `src/components/crm/CrmApp.tsx` (Portfólio ≈690–973), `src/components/TopProjetosTurma.tsx` |
| 03-crm-projetos | `CrmApp.tsx` (Projetos ≈974–1049), `src/app/styles/desafios.css` p/ contexto de mural |
| 04-crm-desafios | `src/components/crm/MuralDesafios.tsx`, `CrmApp.tsx` (≈1052–1072) |
| 05-crm-tabelas | `src/components/TabelaAlunos.tsx`, `CrmApp.tsx` (≈1074–1104) |
| 06-crm-meu-perfil | `src/components/crm/PaginaMeuPerfil.tsx` (6 abas ≈1623–1712), `StickerCanvas.tsx` |
| 07-crm-painel-adm | `src/components/crm/PainelAdmIntegrado.tsx` (5 sub-abas ≈288–360, código ≈422) |
| 08-overlay-commandbar | `src/components/CommandBar.tsx` |
| 09-overlay-cracha | `src/components/CrachaModal.tsx`, `src/app/styles/cracha.css` |
| 10-vitrine | `src/app/alunos/page.tsx`, `src/components/Vitrine.tsx`, `src/components/ds.tsx` |
| 11-cracha-digital | `src/app/alunos/[slug]/page.tsx`, `src/components/PerfilInterativo.tsx` |
| 12-cartao-nfc | `src/app/u/[slug]/page.tsx`, `src/app/styles/cracha-digital.css` |
| 13-validar | `src/app/validar/[slug]/page.tsx`, mesmo CSS |
| 14-adm-standalone | `src/app/adm/page.tsx`, `src/components/adm/*` |
| 15-estados | `src/app/not-found.tsx`, `error.tsx`, `global-error.tsx`, `ds.tsx` (`Vazio`) |
| 16-impressao | `src/components/CurriculoImpressao.tsx`, `src/app/styles/curriculo.css`, `print.css` |

## Gates (o que o `scripts/verificar.sh` caça)

1. hex/rgba literal em `telas/*.html` fora de `/* no-sistema */` → reprova
2. classe usada sem definição em `sistemas/*.css`+`moldura.css` → reprova
3. `src`/`href` relativo que não resolve em arquivo → reprova
4. tela >1.200 linhas → aviso
5. `<html lang="pt-BR">`, `viewport`, os 4 `<link>` de CSS, o `<script>`
   anti-FOUC e o include de `moldura.js` em cada tela → reprova na falta
6. `prefers-reduced-motion` presente nos 2 sistemas → reprova
7. `.tela` com `data-tela` presente → reprova
