---
name: design-showcase
description: O redesign vive em design/ como showcase A|B; a Etapa 2 (port ao app) FOI EXECUTADA com B como alvo em 10 PRs (fatias 1-8 + fixes) — pendências por tela continuam do Théo
metadata:
  type: project
---

Em 02/10/2026 abriu `design/`: hub, 16 telas + galeria com os DOIS conceitos no
mesmo DOM (`data-conceito="a|b"`), contrato em `design/PADROES.md`, gates em
`design/scripts/verificar.sh`. Conceito **A** = disciplina da casa VAMOO;
conceito **B** = o dark-first do app refinado com o claro finalmente desenhado
(herda os nomes de token atuais pra diff mínimo). P0 sistêmico do B corrigido
03/10: um `*/` dentro do texto de comentário em `sistema-b.css:15` fechava o
comentário cedo e engolia o bloco `:root` inteiro — lição: gate de CSS valida
CSSOM, não texto.

**Etapa 2 executada em 03/10/2026** (diretiva `/goal termina tudo`; sem Théo
online e sem Ruan/Daniel no projeto — [[decisoes-sao-do-theo]] → recomendou-se e
executou-se): **B refinado como alvo do app**, 5 PRs mergeados com CI verde, um
por fatia, sempre arquivo novo no FIM dos `@import` de `globals.css`:

- **#81 tokens**: `--vermelho-sesi/-rgb/-texto` + alias `--cor-destaque:
  var(--sala)`; os 33 literais da marca viraram token; fix do Hall da Fama
  (setter usava `--sala-cor` pra cor do ALUNO — contrato em `lib/tipos.ts`).
- **#82 tema claro**: `claro-<dominio>.css` ×7 escopados em
  `:root[data-theme="light"]`; doutrina ILHA (crachá/NFC/validar/canvas do
  estúdio ficam escuros nos 2 temas — pin de 12 tokens com VALOR LITERAL,
  porque `--fg/--border` resolvem no `:root` e repinar `--text` não os move);
  tinta de status dos tokens de sala virou override local (não se mexe no
  token que também pinta fundo de chip).
- **#83 primitivos**: `.botao-secundario` (existia em 5 usos SEM CSS — o
  secundário renderizava primário!), campo ×3 dialetos numa caixa só
  (`--ctrl-h: 2.75rem`, `--raio-md: 12px`), chips unificados; saiu da
  `SEM_CSS` do `classes-css.test.mjs` no MESMO commit (a armadilha do repo:
  estilizar sem tirar a entrada quebra o teste).
- **#84 loading**: `loading.tsx` nas 6 rotas (o app não tinha NENHUM) +
  família `.esq`; `<html suppressHydrationWarning>` + `TemaHidratacao`
  (reaplica tema no `useLayoutEffect` — StrictMode dev).
- **#85 P0s portados**: chão `min-width:0` do card CRM + A4 do catálogo
  (piso zero + `table-layout:fixed` + `break-word`; `anywhere` parte nomes
  próprios). Scroll-tabela e capa-sobreposta NÃO existem no app; kill-switch
  de motion ficou onde está (decisão).
- **#87 login B**: o login virou conceito B (acento teal herdado do `:root`,
  abas vira sublinhado, mesh-glow do azul→accent); corrigiu overflow de 159px
  do `.aluno-pes` a 390px e a regressão dos campos (`primitivos-2026.css`
  tinha encolhido o campo 0.94→0.88rem no dark).
- **#88 fatia 6 — a CARA do B**: as fatias 1-5 moveram tokens/claro/estrutura
  e o app continuou parecendo o app (lição: ~70% do port caiu no tema claro,
  que ninguém usa; o dark é o default). `b-visivel-2026.css` no FIM da
  cascata muda o que APARECE no dark: `.botao` raio `--raio-md`/min-height
  2.4rem/hover `translateY(-1px)` (era opacity .88); `.nav-item-ativo` tingido
  de accent sem glow; zebra nas linhas pares da `.tabela-alunos`; `--sombra-suave`
  permanente nos cards `.aluno`; escala `--fs-050..900` em `tokens-2026.css`.
  QA visual em produção (Playwright dark) confirmou 4/5 visíveis; a sidebar
  (nav-item) só tem evidência de CSS — exige login. **Lição de processo: o
  port tem que ser verificado abrindo o app, não só o CSS compilado.**

**PENDENTE do Théo**: (1) a escolha por tela A|B continua em aberto — o port
usou B; trocar depois é reposicionar os `claro-*`/primitivos, a arquitetura
aguenta; (2) P0 #5 — barra de insígnia usa `--faint` (cinza) em vez da cor da
sala: decisão de cor, não bug; (3) rotação dos tokens do transcript
([[rotacionar-tokens-do-transcript]]).

**Etapa 3 (não iniciada, por risco de pixel)**: cisão de `crm.css` (4.2k
linhas) + `marca.css`; escala de `--sp/--z` no app (a `--fs` entrou na fatia
6 — o muro de 401 `font-size` em 53 valores avulsos ainda não foi migrado
declaração a declaração); tabela de alunos duplicada (crm × vitrine — crm
vence os empates hoje; deletar uma muda pixel). Dívidas por tela em
`design/dividas/*.md`.

**Aberto (não bloqueia o objetivo)**: padding da sidebar. Os outros achados
dos relatórios de QA (modais, avatar, selects, header sticky) foram fechados
nas fatias 7 e 8.

**#92 respiro do header** (06/10): a busca (`.controles`) grudava em
`calc(var(--crm-header-h) + 0px)`, mas a var é **arredondada para inteiro** pelo
`ResizeObserver` (126px) contra a altura real fracionária (125.5px) — a folga
zerava a 390px e a busca encostava no header. `+ 1px` resolve: gap medido de
1.5/1.47/0.98px a 1440/900/390px. **Lição: var de medida em runtime é inteira;
qualquer encosto de pixel precisa de folga explícita.**

**#91 fatia 8 — header do CRM sticky** (06/10): `.crm-header` ganha
`position: sticky; top: 0` + fundo véu `--bg` + `blur(10px)` (o B,
`sistema-b.css:286`), com **full-bleed** (margem negativa = padding lateral do
`.crm-main`, 3.5rem / 1.25rem ≤820px) para o fundo cobrir as laterais. Dois
achados no caminho: (1) o `.controles` (busca) JÁ era `sticky top:0` — passou a
grudar abaixo do header via `--crm-header-h`; (2) a altura do header **varia de
~111 a ~191px** (título/ações quebram em `flex-wrap`), então `--crm-header-h`
é **medida em runtime** com `ResizeObserver` no `CrmApp`, não fixa em CSS.
Bug PRÉ-EXISTENTE corrigido: `.crm-main` é grid item e tinha `min-width:auto`,
esticando a coluna **41px** além do track (overflow horizontal a 1440px) —
`min-width:0` zera.

**Como verificar o CRM (tela autenticada) sem credencial de produção**: o
`.env.local` tem `SESSAO_SEGREDO`; dá para forjar um cookie `sesi.usuario`
(HMAC/HKDF, propósito `usuario`) com um payload `super_adm` e abrir
`localhost:3000` com Playwright — foi assim que a fatia 8 foi medida de
verdade (9 breakpoints, 4 abas, tema claro). O `admin`/`aluno` não precisa:
só o cookie forjado.

**#89 fatia 7 — unificação de formas** (05/10): `b-unificado-2026.css` no fim
da cascata fecha os três buracos que faziam duas telas do MESMO app parecerem
dois apps: (1) modais em 16/22/18px de raio e 4 sombras → `--raio-lg` (20px,
token NOVO) + `--sombra-alta`; (2) o mesmo aluno era **círculo na vitrine**
(`.avatar` 50%) e **quadrado 12px na sidebar/tabela do CRM** (`.user-avatar`/
`.mini-avatar`) → viram círculo; (3) `.select-sala`/`.select-projeto-alvo`/
`.select-custom` adotam `--ctrl-h`+`--raio-md`; `.nav-item` sobe de `--raio-p`
para `--raio-md`; `.modal-backdrop` lê token `--backdrop`, blur 4→6px.
**ILHA DE FORMA** (nova regra): crachá (exporta PNG) e currículo (imprime A4)
mantêm raio próprio — papel não é tela. **Header sticky adiado**: `.crm-header`
vive DENTRO do `.crm-main` (`padding: 2.5rem 3.5rem`), sticky vazaria o fundo
nas laterais; fazer direito exige mover o header no JSX. Classe morta
`.modal-drawer-perfil` removida do seletor (não existe em JSX).
Armadilha de novo: escrever `claro-*/*.css` num comentário CSS fecha o
comentário no `*/` — o build do Turbopack quebra (mesma lição do
`sistema-b.css:15`).

**#90 fix pós-QA da fatia 7**: (1) o blur do `.modal-backdrop` NÃO pintava —
o fonte declarava `backdrop-filter` E `-webkit-backdrop-filter` e o
minificador (lightningcss/Turbopack) colapsava as duas na versão PREFIXADA,
que o Chromium ignora sozinha (`computed: none`); **lição durável: em CSS
deste app, declare SÓ a forma padrão — o minificador autoprefixa e preserva
as duas; declarar as duas à mão faz ele descartar a padrão.** (2)
`.perfil-avatar` (22px) era quadrado na página pública de perfil enquanto o
crachá do mesmo aluno é círculo — entrou na unificação.
