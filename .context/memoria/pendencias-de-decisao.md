---
name: pendencias-de-decisao
description: "O que continua pendente por ser decisão (design/produto) e o que ficou decidido nesta rodada — pra ninguém \"consertar\" de volta o que foi decidido"
metadata:
  node_type: memory
  type: project
  originSessionId: 19e12991-e45f-4f11-b062-9aa898ea5c51
  modified: 2026-09-29T23:27:10.000Z
---

Levantado em 2026-09-25, ao fechar a onda 3/4. Nada aqui é oversight: cada item foi
identificado e medido. Os que sobraram esperam decisão; os que fecharam estão aqui
pelo motivo inverso — parecem bug pra quem lê o código depois.

**Já resolvido, não reabra sem falar com o Théo:**

- **O gate de moderação de cadastro é intencional — e já foi removido uma vez.**
  Em 30/09 o commit `705716c` ("remove exigência de aprovação") tirou o gate de
  todos os pontos, e o lote de 8 commits entrou na `main` **por push direto, sem
  PR** — então ninguém revisou. Restaurado no mesmo dia. O que a remoção faz, com
  cenário: um anônimo cria conta (sem convite, sem confirmação de vínculo) e no
  mesmo tick o perfil aparece em `/alunos`, em `/alunos/<slug>` (com `<title>`
  indexável), em `/u/<slug>` e em **`/validar/<slug>`, que emite o documento
  "MATRÍCULA VALIDADA · ESTUDANTE ATIVO"** para quem nenhum humano confirmou ser
  aluno. A coluna é `aprovado boolean NOT NULL DEFAULT true` (`011:20`) e a
  policy `alunos_leitura` do anon é `using (true)` (`001_schema.sql:137`):
  **não há RLS nem `null` para segurar — o `.eq("aprovado", true)` de
  `listarAlunos` e os `!aluno.aprovado` das três páginas são a barreira
  inteira.** Se o atrito do cadastro incomodar, o caminho é verificação de
  domínio de e-mail, não tirar o gate. O ADM criando aluno nasce aprovado pelo
  `DEFAULT true` — isso é de propósito, é a aprovação.
- **O que a mesma revisão achou e não pode voltar** (30/09, tudo no mesmo PR):
  (1) a senha mínima é **8**, não 4 — o comentário de `problemaDaSenha` diz que a
  divergência 4/8 era bug a corrigir, e baixar para 4 é reintroduzi-lo.
  (2) `garantirSala` (`adm/acoes.ts`) e o passo 4 do login buscam **em memória**,
  não por `ilike`: `%` e `_` digitados viram curinga no `ilike`, e o comentário do
  `auth.ts` registra isso — não "simplifique" de volta. **Mas a chave é
  `chaveDaSala`, não o `fold`** — ver o item (9).
  (3) `alunos.email` é o que o aluno **digitou** e passou em `sanitizarEmail`;
  `null` quer dizer "não informou" — não fabrique `username@estudante...`, que a
  vitrine exibe como prova de vínculo e que viola o CHECK quando o username tem
  dois `@` ou começa com `.`/`-`/`_`.
  (4) `StickerCanvas` recebe `alunoId` **obrigatório** — o caminho no Blob é
  escopado à pasta do aluno e a rota de token recusa outro; o upload de sticker
  vai ao Blob como a mídia, e nunca em base64 no corpo do POST (é a classe do
  teto de 4 MB).
  (5) O upload do banner tem **dois** guardas: a geração pega o recorte
  abandonado e o `bannerAtual` pega o "Remover" feito por fora do modal. Os dois
  são necessários; remover um reabre a corrida.
  (6) `corDaSala` normaliza **dentro do hash** (`cores.ts`) — CRM e vitrine
  passam o nome cru de propósito, e normalizar por fora faz as duas telas
  discordarem sobre a cor da mesma sala.
  (7) No tema claro os badges de cargo são **pílulas opacas** de propósito: eles
  vivem em três ilhas que continuam escuras (`cracha-card`, `nfc-hero-card`,
  `perfil-hero-banner`), e uma cor escura translúcida sobre elas dava 1,03:1.
  A conta está no comentário do CSS.
  (8) O cargo do crachá **só vem por prop**, nunca de `aluno`: `role` mora em
  `public.usuarios`, não em `alunos`. O cast que existia lia `undefined` sempre,
  e fica de fora de propósito porque buscá-lo publicaria quem é ADM.
  (9) A chave de identidade de uma turma é **`chaveDaSala` (`cores.ts`) — `trim` +
  caixa alta —, NÃO o `fold` de `busca.ts`**. Os dois parecem a mesma coisa e não
  são: `fold` é equivalência de BUSCA (apaga `º`, `ª` e acento, para "3ºA", "3oA" e
  "3A" acharem a mesma coisa quando alguém digita), e `salas.nome` é `unique` sem
  `citext` — logo "3ºA" e "3A" são **duas linhas** no banco. A correção do `ilike`
  em 30/09 usou `fold` na identidade e trocou um bug por outro: a planilha com "3A"
  matriculava o aluno na turma "3ºA", agora sem nem o sintoma que o `ilike` dava.
  `garantirSala` e `corDaSala` leem a mesma chave de propósito — a mesma turma tem
  a mesma cor em qualquer tela e a mesma identidade no cadastro.
  `tests/cores.test.mjs` guarda a diferença.


- **Trava de foco nos 5 diálogos** — implementada em `src/lib/foco.ts` (o núcleo
  `proximoFoco` é puro e tem teste; o resto é o efeito). O listener fica no
  `document`, não no container: o caso que importa é o foco *já ter* escapado.
- **`--faint` do tema escuro** — está em `#8291a8`, o menor clareamento que passa
  AA nos quatro fundos escuros. A conta está no comentário do token, em
  `src/app/styles/tokens.css`.
- **`/alunos/[slug]`** — virou `noindex, follow` e o sitemap ficou só com
  `/alunos`. Era contradição: o mesmo aluno já era noindex em `/u/[slug]` e
  `/validar/[slug]`, e o sitemap convidava justamente a porta que o HTML mandava
  não indexar. Reverter é uma linha, se a decisão de produto mudar.
- **`alunos.habilidades` NULL ainda cai no regex da bio** — em `resolverAluno`
  (`src/lib/dados.ts`), `null` significa "nunca editou o perfil" e resolve para
  `extrairHabilidades(bio)`; `[]` significa "escolheu não ter nenhuma" e NÃO cai
  no fallback. Verificado em produção em 2026-09-25: a coluna está NULL para
  todos e `/alunos/beatriz-vasconcelos` mostra "Web Frontend" vindo da bio — não
  é resíduo do código antigo, é o que impede todo aluno de acordar sem
  competência no dia do deploy (PR #16).
- **A ordem migration → deploy é obrigatória, não zelo.** `CAMPOS_ALUNO` passou a
  selecionar `habilidades` e `listarAlunos` lança em erro do PostgREST: um deploy
  antes da migration derruba a vitrine inteira, não só o campo novo. A 009 foi
  aplicada em produção em 2026-09-25, antes do merge.
- **`PainelAdmIntegrado` deixou de desmontar a aba inativa** (PR #7). Foi decidido
  **manter**: o `aria-controls="adm-painel-alunos"` só funciona se o elemento
  existir no DOM, então voltar a renderizar condicionalmente quebraria a ligação
  ARIA que a auditoria tinha acabado de confirmar inteira. Se alguém for
  "consertar" isso, é aqui que para.

- **O teto de 4 MB do POST do editor foi resolvido em 2026-09-27**, não
  contornado. Ele era o limite real da edição porque a mídia viajava em base64 no
  corpo do Server Action; agora o navegador manda o arquivo direto para o Vercel
  Blob (`blobDoDataUrl` e `caminhoDaMidia`, em `src/lib/blob.ts`, mais a rota
  `/api/upload`) e o corpo carrega só a URL.
  Só galeria e capa de projeto migraram: foto (120 KB), capa (220 KB) e stickers
  (2 MB de soma) continuam data URL e somam ~2,4 MB, abaixo do teto. Ver
  `midia.md`.
- **A Onda 2 destravou porque as duas premissas eram falsas** (2026-09-27). O
  levantamento dizia que criar o store "tem custo por uso" e que migrar o acervo
  em base64 seria difícil. Medido: o projeto está no plano **Hobby**, onde o Blob
  é grátis dentro dos limites e **não cobra excedente** (para de funcionar até o
  próximo ciclo), e o banco **não tinha um único byte de base64 de imagem** — as
  mídias eram URLs `http`, e `foto_url`/`banner_url` estavam NULL para todos os 13
  alunos. Não houve migração a fazer.

- **O pente nas abas fechou cinco buracos, nenhum deles de design** (28/09, PR
  #45). A auditoria estática das 6 abas do CRM e das 5 sub-abas do ADM achou cinco
  defeitos, todos com cenário concreto e todos corrigidos:
  (1) "Ir para Painel do ADM" era oferecido a visitante anônimo e a aluno, e
  `/adm` responde `notFound()` — a pessoa caía num 404 **afirmando que o recurso
  não existe**, o que não era verdade; o item agora só aparece com
  `podeAdmin(cracha, papel)`.
  (2) "Copiar Link da Vitrine" jogava fora o retorno de `copiarTexto` (`void`) e
  fechava no mesmo tick: com a área de transferência recusando, a pessoa colava o
  conteúdo **antigo** achando que tinha mandado o link. Era a única das cinco telas
  que copiam a não usar o retorno.
  (3) Reimportar uma planilha já completa devolvia `ok: false` e pintava banner
  **vermelho de erro** ("12 já estavam completos") — não mudar nada não é falha;
  virou o tom `atencao`, com `tomDaImportacao` em `src/lib/importacao.ts`.
  (4) A aba Tabelas herdava em silêncio os filtros do Portfólio (busca, sala,
  competência) e um F5 "consertava" — o CRM mostrava menos gente que a turma, sem
  dizer por quê.
  (5) "Mover de turma" com o campo vazio era **clique morto**: a action devolve
  `void` quando `nomeSala.length < 2`, então não havia erro, aviso nem mudança.
  Ganhou `required minLength={2}` (a barreira nativa é feedback, o servidor
  continua sendo a regra).
  O gate do CRM segue `ehSuperAdm`, e é de propósito: `CrmApp` é client component
  e não enxerga o cookie `httpOnly` `sesi.adm` — a sub-aba do ADM na sidebar sempre
  foi gated assim. Ver [[infra-deploy]] para o fluxo de PR.
- **O card do login não é mais centralizado** (29/09, PR #49). Centralizado, o
  topo dele era função da própria altura, e as três abas medem 621px ("Entrar"),
  800px ("Ativar") e 897px ("Criar Conta"): trocar de aba movia o card 95px no
  desktop e **137px no tablet** — a mesma família do "pulo" da carga, só que no
  clique. Agora ele ancora no topo (`align-items: flex-start` mais
  `padding-block-start: clamp(1.5rem, 7vh, 6rem)`) e o pulo medido é 0 nas cinco
  alturas de teste. O preço está no comentário do CSS: em tela grande a
  composição fica assimétrica (card no terço de cima) e, numa janela de 860px de
  altura, o painel "Ativar" passa a rolar 24px, onde antes cabia (número
  remedido em produção; a primeira medição saiu a 8vh). Reservar a
  altura do maior painel foi descartado: custaria 276px de espaço morto em toda
  aba. A mesma leva encurtou o rótulo da terceira aba para "Ativar" — ver
  [[acesso-por-codigo]].
- **A estrela do perfil público passou a saber do voto do visitante** (29/09, PR
  #54), e o sintoma era outro do que o relatório dizia. `PerfilInterativo`
  nascia com `estrelado = false` **sempre** e `src/app/alunos/[slug]/page.tsx`
  nunca lia o cookie `sesi.visitante` — a vitrine já lia
  (`src/app/alunos/page.tsx:34`). Quem já tinha votado abria o perfil com a
  estrela apagada, e **o clique não denunciava o erro**: `POST /api/estrela` em
  voto existente cai no `ignoreDuplicates` (`route.ts:86-91`) e devolve
  `200 { votado: true }`, então o componente mantinha a estrela acesa sem
  gravar linha nova. O defeito é o **estado inicial errado**, silencioso — não
  "confete e nada", que foi como a primeira versão do relatório descreveu (e
  como a mensagem do commit ficou). A prop `estreladoInicial` entrou
  **obrigatória**: com valor padrão o erro voltaria pela terceira tela que
  esquecesse de passá-la, e o `tsc` é quem trava. O mesmo PR removeu um
  `CartaoAluno` importado e nunca usado em `CrmApp` — mesmo tipo do
  `IconeCopiar` do #52, invisível para o `tsc` sem `noUnusedLocals`.
  Ficou de pé, consciente: a leitura de votos usa a **service role**
  (`clienteAdmin` em `votosDoVisitante`) e entra no `Promise.all` da página,
  que não tem `try/catch` — se só ela falhar, o perfil cai no error boundary.
  Engolir o erro ressuscitaria em silêncio a estrela errada que o PR mata, e o
  `/alunos` também prefere falhar alto a mostrar lista errada.
- **A mensagem crua do banco saiu das rotas de API** (29/09). `/api/estrela`
  devolvia `{ erro: error.message }` do PostgREST em 500, nos dois ramos (POST e
  DELETE), sem escrever nada no log — e `error.message` ali nomeia tabela e
  constraint. Agora o erro vai para o `logger.error` e o corpo volta vazio, o que
  faz o cliente cair em `RECUSA_PADRAO` (`src/lib/estrela.ts`); é o mesmo desenho
  do `motivoDaFalha` (`src/app/adm/acoes.ts`), que traduz o código e manda o erro
  real para o log. No mesmo PR, os dois `maybeSingle` de apoio
  (`contarEstrelas`, `alunoVisivel`) passaram a registrar o erro que engoliam em
  silêncio — o de `alunoVisivel` era pior: a falha de leitura virava o **mesmo
  404 de "perfil pendente"**. Em `/api/upload`, só as três recusas escritas na
  própria rota (agora `RecusaDeEnvio`) podem virar frase; `BlobError` da
  biblioteca vai para o log com uma frase da casa e status 500. Quem trava isso
  no CI é `tests/erro-interno.test.mjs`, que varre todo `src/app/api` atrás de
  `.message` dentro de um literal de `NextResponse.json`. A revisão do PR #60
  achou a **mesma classe fora do diff, e mais grave**: `src/lib/auth.ts` mandava
  `Erro ao criar perfil de estudante: ${erroAluno?.message}` para a tela de
  cadastro — um anônimo lendo `duplicate key value violates unique constraint`.
  Os dois pontos agora logam o erro e devolvem frase da casa (o nome de usuário
  já era checado antes, então o que sobra ali é corrida). A varredura não pega
  esse caso — ela só olha `src/app/api` e só o literal de `NextResponse.json`;
  a lista do que escapa está no cabeçalho do teste.

- **O teste do `+1` deixou de contar por arquivo** (PR #62). `endosso.test.mjs`
  passava com o `habilidadePermitida` em **qualquer lugar** do arquivo — inclusive
  num trecho que não envolve botão nenhum —, enquanto a conta por arquivo
  (`guards >= botoes`) continuava fechando. Agora cada `btn-endorsement-add` é
  conferido na vizinhança: o guard tem que estar nas 500 letras anteriores à
  classe (distância real medida nos dois pontos: 133 e 145), **e o botão não pode
  estar no ramo do `:` do ternário** — esse é o pior caso, porque renderiza
  exatamente quando o guard falha e o teste daria verde no bug que ele existe
  para impedir. O ramo é decidido contando parênteses/chaves/colchetes do guard
  até a classe, com **string e comentário pulados inteiros**, e olhando o `:`
  que aparece com o aninhamento zerado (um `:` dentro de `style`, `title` ou
  spread não conta — foi assim que a primeira versão reprovava botão correto).

  Foram **quatro** rodadas de revisão até o teste ficar honesto, e as três
  primeiras versões passavam verdes no bug que o teste existe para pegar — o
  registro vale porque o padrão se repete em varredura: (1) a janela sozinha era
  satisfeita por um botão no `else`; (2) proibir qualquer `:` no caminho
  reprovava código certo; (3) o matcher compartilhado **com a flag `g`** deixava
  o `lastIndex` do `.test` no meio e a varredura **pulava o arquivo seguinte em
  silêncio**; (4) a contagem de nível, que eu tinha documentado como "falha para
  o lado barulhento", **também aprovava o botão do ramo errado** quando um `)`
  ou `{` desbalanceado aparecia dentro de um literal do ramo do `true`. Os quatro
  estão fechados em código e provados por mutação.

  O que resta é quase tudo barulhento, de propósito: a janela estoura, e o `\"`
  ou regex literal dentro do trecho reprovam por excesso de zelo. **Uma exceção,
  e é silenciosa:** aspa solta em texto JSX (`<span>aluno's</span>`) abre uma
  "string" fantasma que nunca fecha, a contagem para antes do `:` e o botão no
  `else` passa verde — e, ao contrário do que eu supus na rodada 4, isso
  **compila** (texto JSX não é literal JS; o revisor provou com o parser TSX do
  repo). Não existe em `src/components/` hoje. Se aparecer, trocar a contagem de
  caractere pelo parser TSX em vez de somar mais uma regra. Continua fora também:
  o `+1` desenhado **sem** essa classe e o que estiver fora de `src/components/`.

- **A `Vitrine` passou a ler a resposta da estrela pelo helper da casa** (29/09).
  Era a única das três telas que fazia `await resposta.json()` cru —
  `CrmApp:300` e `PerfilInterativo:194` já usavam
  `lerRespostaEstrela(status, await resp.json().catch(() => null))`. Sem o
  `catch`, um 500 sem corpo JSON subia `SyntaxError` e a frase crua ia para a
  tela; e um 200 sem os campos mantinha o otimista na contagem enquanto revertia
  o `meus`, mostrando um número que ninguém calculou. Agora as três telas leem
  igual. **Mudança de texto visível:** a recusa padrão da Vitrine era "não deu
  para votar" e agora é a `RECUSA_PADRAO` do `src/lib/estrela.ts`, "Não deu para
  votar agora. Tente de novo." A revisão do #63 pegou que o `catch` continuava
  divergente — mostrava `erro.message`, isto é, "Failed to fetch" cru na tela. O
  desenho agora é o mesmo do `PerfilInterativo`: recusa do servidor sai com o
  `motivo` do helper, e falha de transporte com a frase de conexão da casa.
- **O `logger.error` deixou de perder o `code` e o `hint` do PostgREST** (29/09).
  `PostgrestError` **estende `Error`**, então o `erro instanceof Error ?
  erro.message` de `src/lib/debug.ts:74` mandava só a mensagem — e o pacote diz o
  contrário no doc do próprio tipo: *"Always log the full object; logging only
  `error.message` hides the hint"*. Agora `descreverErro` acrescenta `code` e
  `hint` **quando existem** — o `code` do Node (`ENOENT`) entra pela mesma porta,
  e um `Error` sem os campos sai como sempre saiu. **O `details` fica de fora de
  propósito:** é o campo que ecoa o *valor* da coluna (`Key (username)=(theo)
  already exists.`) e o log não é lugar de dado de aluno — achado da revisão do
  #63, que também mostrou que o `mascararSegredos` não pegaria isso (ele filtra
  por nome de campo, e string com espaço não é truncada). `tests/debug.test.mjs`
  (6) trava as duas pontas: os dois campos entram, o valor não.

- **O `throw` de `dados.ts` parou de carregar o texto do banco** (29/09). Os dez
  pontos faziam `throw new Error(\`listarSalas: ${error.message}\`)`, e `dados.ts`
  era a última casa desse formato em `src/`. Agora cada um registra o erro cru no
  `logger.error` — que desde o #63 carrega `message`, `code` e `hint` — e lança
  uma frase da casa; **quatro** deles (`alunoPorSlug`, `alunoPorId`,
  `apoiarHabilidade`, `votosDoVisitante`) não registravam nada e passaram a
  registrar. **Sem mudança de tela em produção**, e é isso que tornou a decisão
  barata: o Next sanitiza a mensagem de erro de Server Component e nenhum desses
  `throw` é alimentado por um `catch` que mostre o texto — ou não há `catch` (sobe
  ao error boundary, cujo `<details>` com `error.message`, em `src/app/error.tsx`,
  é dev-only), ou o `catch` devolve frase própria. (A primeira versão deste
  parágrafo dizia "três deles" e "o único lugar que renderiza `error.message`";
  as duas eram falsas — a revisão do #65 mediu quatro pontos sem log, e o repo
  tem outros lugares que mostram erro derivado de `err.message`, nenhum alimentado
  por `dados.ts`.) A revisão achou ainda um **relabelamento** na mesma função:
  `if (errLeitura || !aluno)` lançava "Aluno não encontrado" para falha de leitura
  também — causa errada no lugar do diagnóstico; agora as duas se separaram e a
  falha de banco vai para o log. O desenho é o que o `garantirSala`
  (`src/app/adm/acoes.ts:109-113`) já fazia, com o comentário dizendo o porquê.
  O segundo teste de `tests/erro-interno.test.mjs` trava o formato em **todo** o
  `src/`, com 8 casos provados por mutação — inclusive a reintrodução **noutro
  arquivo** (`acoes.ts`), o `${error.details}` e o falso alarme da palavra
  "message" na prosa. O que ele **não** garante está no cabeçalho, e o principal
  é este: ele impede o jargão de virar mensagem, **não** exige que o erro vá para
  o log — apagar um `logger.error` deixa o verde de pé e o erro invisível. A
  decisão que este item esperava ("o que cada `throw` diz na tela") era menor do
  que parecia: em produção nenhuma dessas frases chega à tela.

- **`noUnusedLocals` está ligado, e a família de import morto virou falha de CI**
  (29/09). Três revisores esbarraram em import morto — `IconeCopiar` (#52),
  `CartaoAluno` (#54) e onze de uma vez (#57) — e nenhum era visível para o `tsc`
  como o projeto estava (não há lint). Medido antes de ligar: a flag sozinha
  acusava **24**; com `noUnusedParameters` junto, **29**. Os 24 eram 17 imports
  mortos e 7 locais mortos (`db`, `setDesafios`, `setSala`, `setNovaMidiaTipo`,
  `totalFixados`, `github`, `linkedinHandle`), todos limpos — e a limpeza de
  `github`/`linkedinHandle` no `PerfilInterativo` derrubou por **cascata** um
  import inteiro (`@/lib/links`), que só a flag mostra. Provado por mutação: um
  `const naoLido = 1` faz o `tsc --noEmit` **e** o `next build` falharem.
  **Nada de comportamento mudou**: os dois `useState` que perderam o setter
  (`desafios` no `CrmApp`, `sala` no `PaginaMeuPerfil`) ficaram como estado de
  propósito, porque o valor vem da prop e o estado o congela — trocar por acesso
  direto à prop mudaria a semântica de ressincronização. O `novaMidiaTipo` é o
  caso diferente, e está dito no código: nunca foi setado e o valor lido é sempre
  o default, então virar constante seria equivalente — ficou como estado por ser
  onde um seletor de tipo escreveria. E o `const db = clienteAdmin()`
  (`acoes-crm.ts:241`), que era o risco desta limpeza, virou `clienteAdmin();`
  **sem binding**: o fail-fast (lança quando falta `NEXT_PUBLIC_SUPABASE_URL` ou
  `SUPABASE_SERVICE_ROLE_KEY`) continua explodindo no mesmo ponto.

**Continua aberto:**

- **As recusas do `/api/upload` não chegam à tela de quem envia** (achado de
  29/09, ao consertar o vazamento). Medido no pacote instalado: o `upload()` do
  `@vercel/blob/client` lança `BlobError("Failed to retrieve the client token")`
  quando a resposta não é `ok` (`node_modules/@vercel/blob/dist/client.js:398`),
  **sem ler o corpo** — então as três frases escritas para o aluno ("Entre como
  aluno para enviar imagens.", "Endereço de envio fora da sua pasta.", "Muitos
  envios em pouco tempo. Aguarde um instante.") morrem no corpo HTTP, e quem
  envia vê o texto em inglês da biblioteca. O conserto do vazamento as manteve no
  corpo: são nossas, não são detalhe interno, e são o contrato da rota. Fazê-las
  aparecer é mudança de comportamento visível — ou envolver o `upload()` num
  wrapper que leia o corpo, ou trocar o client por `fetch` próprio — e é decisão
  de produto. Vale saber, antes de decidir, que o cliente já descarta o corpo
  hoje: ninguém perde nada que estivesse funcionando.
- **`btn-ver-autor` fechou (30/09).** Ele era **o único defeito de tela** do
  cluster de classes sem CSS: um `<button>` sem classe base nenhuma
  (`CrmApp.tsx`), que recebia o visual default do navegador dentro de um card
  escuro — mesma família do `textarea-bio`, o bug que originou a varredura.
  Ganhou CSS real no lote de 30/09, junto de `criacao-rodape` e
  `criacao-sem-link` (`crm.css:964,923,957`).
- **O cluster de classes sem CSS está medido e travado** (PR #61). Hoje são
  **29 classes órfãs em 809 usadas**, classificadas por motivo em
  `tests/classes-css.test.mjs` (INLINE, BASE, TEXTO, CAIXA), e o teste falha nas
  duas direções — órfã nova não classificada e classe da lista que ganhou CSS.
  As 29 são cosméticas: 6 têm o visual em `style` inline, 4 acompanham classe
  viva que já estiliza, 9 são texto que herda tipografia, e **12 são containers
  com filhos estilizados — esses 12 são o grupo que pede decisão de design**,
  não conserto mecânico. O `vazio-suave` é o mais visível deles, mas aparece em
  **três seções da mesma tela** (`Meu Perfil`: criações, galeria e vídeos), não
  em três telas.
- **`/api/health` é público e sem rate limit** (29/09). Uma query no Supabase por
  chamada; não há `middleware.ts` e o `src/proxy.ts` não trata essa rota. Não
  apliquei `verificarRateLimit` de propósito: monitoramento bate nele em intervalo
  curto e um 429 derrubaria o próprio monitor. Decisão de infra, não fix.
- **`role: "adm"` ficou incoerente entre servidor e UI** (agravado em 30/09). O
  valor existe no schema (`003_crm_auth.sql`) e no tipo. Desde o lote de 30/09,
  `exigirAdm` (`adm/acoes.ts:54`) **aceita** `role === "adm"`, enquanto
  `podeAdmin` (`lib/sessao.ts:119-123`) continua exigindo crachá válido ou
  `super_adm` — então o servidor autoriza o que o cliente não desenha. Quem for
  usar `adm` de verdade precisa alinhar os dois lados do gate; hoje o valor é
  sem consumidor e a assimetria confunde.

- **A estrela bloqueada não diz mais "carregando"** (fechado em 29/09). O `title`
  que nunca disparava **já tinha sido corrigido** no PR #56 (o motivo passou para
  um `<span class="estrela-wrap">`, que recebe o ponteiro, com o botão `disabled`
  e o `aria-label`). Sobrava o outro sintoma: o `cursor: progress` do
  `.estrela:disabled` foi escrito para o voto **em voo**, transitório, e dizia
  "carregando" justamente no caso **permanente** — o perfil pendente, que tem
  motivo escrito para mostrar. A separação é o `data-bloqueada` no envoltório
  (`TabelaAlunos.tsx` e `CrmApp.tsx`, os dois únicos pontos), com
  `cursor: not-allowed` em `vitrine.css` — **com um seletor que alcança o botão**,
  porque quem está sob o ponteiro é ele e o cursor do `.estrela:disabled` venceria
  o do envoltório — o revisor confirmou os **dois** seletores como load-bearing: o
  do botão cobre a face e o do envoltório cobre os cantos da pílula, onde o
  hit-test cai nele. A varredura `tests/estrela-bloqueada.test.mjs` trava as duas
  peças com 15 casos provados por mutação, e a revisão do #64 endureceu três
  coisas que a primeira versão deixava passar, **todas do mesmo tipo — a asserção
  media uma proxy, não o que a prosa dizia**: o JSX confere o **vínculo** (a
  expressão exata, não a substring `data-bloqueada` — solta ou ligada ao
  `ocupado`, o teste ficava verde e a mentira só trocava de lado); o CSS é lido
  em **todos** os arquivos de `src/`, com nenhum seletor que alcance o wrap
  bloqueado podendo declarar outro `cursor` (um override em `crm.css` vence por
  ordem de import e a varredura de um arquivo só nem o abriria); e nenhum
  `cursor` com `!important` em seletor nenhum, porque ele vence a cascata
  independente de quem alcança — o guard amarrado à substring `estrela` deixaria
  passar um `button:disabled { cursor: progress !important }`, que chega na
  estrela justamente por não dizer o nome dela. **Fica aberto, como design:** o selo visível ao
  lado do nome (`pill-pendente`, `PainelAdmIntegrado.tsx:406`) — é o passo que
  faria o pendente saltar aos olhos, e adiciona elemento à tabela.
- **`votos` não tem índice em `visitante_id`** (29/09). `votosDoVisitante`
  filtra só por `visitante_id` (`dados.ts:488`) e o único índice é a PK
  `(aluno_id, visitante_id)` (`001_schema.sql:72`), então é seq scan. A vitrine
  já fazia essa leitura; o #54 a trouxe também para toda visita a perfil de
  quem tem cookie. Irrelevante nos 13 alunos de hoje; vira dívida se `votos`
  crescer — aí é `create index concurrently`.
- **O `useState(meusVotos)` do `CrmApp` não ressincroniza** (29/09) — **e não é
  alcançável, mas não pelo motivo que este arquivo dizia antes**. O prop *pode*
  ser reentregue ao componente montado: as Server Actions do CRM chamam
  `revalidatePath("/")` (`acoes-crm.ts:445`, `adm/acoes.ts:58` — a rota do
  `CrmApp` é `/`, não `/adm`) e o próprio `CrmApp` documenta que conta com isso.
  O que não muda é o **valor**: o voto é
  do mesmo cookie do ADM, e o voto em si vai por `fetch("/api/estrela")`, não
  por Server Action. Fica como nota para quem algum dia fizer o voto entrar por
  action — aí o estado local fica velho até o próximo clique.
- **Cinco props recebidas e nunca lidas ficam de fora** (29/09), e é decisão, não
  esquecimento. `noUnusedParameters` as acusa, mas elas podem ser **recurso
  morto, não código morto**: `onSelecionarAluno` (`PainelAdmIntegrado.tsx:71`),
  `usuario` (`MuralDesafios.tsx:36`), `retrato` (`CrmApp.tsx:73`), `salas`
  (`PaginaMeuPerfil.tsx:87`) e `compacto` (`TemaToggle.tsx:16`). Duas são
  **obrigatórias** na assinatura, então removê-las mexe em quem chama — é a
  decisão cara que a flag não toma sozinha. Enquanto isso, o `noUnusedLocals`
  sozinho já cobre o caso que mordeu três vezes (import morto) sem tocar em
  assinatura nenhuma.

- **O envio do Arthur espera decisão — e agora dá para decidir** (28/09). O mural
  fechou o ciclo na PR #38: o ADM publica desafio, o ADM julga o envio, o aluno vê
  onde o dele parou. Antes disso o botão "Rejeitar" era **no-op**:
  `submissoes_desafios.aprovado` era `boolean default false` (004:48) e um envio
  novo também nascia `false`, então rejeitar gravava o valor que a linha já tinha.
  A migration **016** tornou a coluna tri-estado (`null` = pendente, `true` =
  aprovado, `false` = rejeitado) e o aluno rejeitado recebe o botão de volta para
  corrigir e reenviar — o envio virou upsert sobre `submissoes_unica_por_aluno`, que
  antes recusaria o segundo com uma mensagem de banco.
  O único envio em produção é o do **Arthur Oliveira**, `"aisdjasdjasçdlajs"`, DSM3
  — criado antes de a fila existir, nunca julgado (o backfill da 016 o devolveu a
  pendente). É decisão de produto: aprovar, rejeitar, ou apagar (o título parece
  teste de teclado).
  **A 016 não pode ser reaplicada às cegas**: o `UPDATE` do backfill transforma
  todo `false` em `null`, e depois dela todo `false` é rejeição de verdade.

- **A UI do mural não foi exercida em navegador** (28/09). A PR #38 fechou o ciclo
  com typecheck, 282 testes e build verdes, mas nenhuma das telas novas — fila de
  envios no painel, selo de status no card do aluno, botão de reenvio — foi aberta
  com sessão real. Mesma situação do caminho do perfil logo abaixo: o primeiro ADM
  a julgar um envio prova.

- **A busca de GIF no Giphy continua bloqueada por insumo externo** (27/09). Não
  é decisão de design nem trabalho de código: falta a **chave da API**
  (`developers.giphy.com`, plano gratuito), que só o Théo pode criar. Sem ela, a
  onda de GIF entrega só a biblioteca curada de presets do `StickerCanvas`. A
  chave vai numa env nova — o `scripts/vercel-env.sh` do repo só faz
  `pull`/`list`/`deploy`, então cadastrar é passo manual no dashboard.
- **Upload de vídeo próprio (ClipeCurto): decidido NÃO fazer** (27/09). O embed
  de YouTube/Vimeo cobre o caso de uso, e o risco é desproporcional: no plano
  Hobby o Blob **para de funcionar** ao estourar o limite (1 GB de storage /
  10 GB de transfer) e não cobra excedente — um vídeo pesado derrubaria o store
  inteiro, inclusive as imagens do perfil. *(Comportamento do plano Hobby
  registrado de memória; não medido no repo.)* Reabrir só se o plano subir.
- **O login do Lucas Bento não tem o domínio da escola** (27/09). Ficou
  `lucas_r_bento@sesisenai.org.br` — sem `estudante.` e sem `.br`, um domínio que não
  existe. O Théo passou esse valor de próprio punho, e foi com ele que a conta nasceu;
  mas a decisão posterior foi "o domínio da escola termina em `.br` e tem que ter isso
  sempre". Trocar o username de quem já recebeu a senha quebra o acesso dele até
  alguém avisar — então é decisão do Théo, não conserto de código.
  O Arthur tinha o mesmo tipo de defeito (`olieira` sem o `v`) e foi corrigido em
  27/09, com o aval dele.
- **O caminho novo do perfil nunca foi exercido com dado real** (25/09): ninguém
  editou o perfil ainda, então `foto_url` e `habilidades` estão NULL para todos
  os alunos e o upload de foto / escolha de competências só foi coberto por
  typecheck e testes de unidade. O primeiro a salvar o perfil pelo CRM prova
  isso — não escrevi em dado de aluno de produção para testar. Verificado em
  27/09: `cor_perfil` e `banner_url` (PR #21) nascem na mesma situação, e os
  contatos do Théo (instagram, github, linkedin e e-mail) estão preenchidos.

- **Por que ele nunca salvou — e a causa era o próprio formulário** (28/09, PR
  #40). O Théo relatou "Salvar não funciona e não dá confirmação". Medido:
  `vercel logs --environment production --since 24h` **não tinha um único POST**
  de Server Action (só `GET /` e `GET /alunos`), e o banco confirmou o perfil do
  `theo-padilha` intocado — os 2 projetos e 2 mídias que aparecem ali são o
  **seed** do `003_crm_auth.sql` (`proj-1`/`proj-2`, imagens Unsplash), não
  edição de ninguém. A causa: validação HTML nativa em campos que vivem dentro
  de painéis de aba com `display: none` — o `required` duplicado do "Nome Visual
  de Exibição" (é o mesmo estado `nome` do "Nome Completo") e o `type="url"` do
  link da criação. Um controle inválido que o navegador **não consegue focar**
  faz ele cancelar o submit **em silêncio**: sem request, sem bolha de validação,
  sem mensagem. Foi trocado por `noValidate` + validação que escreve na tela, a
  barra de salvar virou fixa no rodapé (a confirmação nasce ao lado do botão, não
  ~1200 linhas acima), a capa passou a ser desenhada no hero do editor (só era
  desenhada no perfil público) e o upload ganhou teto de 30 s com
  `AbortController` — sem ele o `finally` que devolve o botão nunca rodava e o
  campo ficava preso em "Enviando a imagem…".
  **Ainda não verificado em navegador com sessão real** — o deploy foi conferido
  (chunk novo no ar, `/api/health` com banco `ok`), mas quem prova o save é o
  primeiro a abrir o perfil e salvar estando em cada aba. Não repita o diagnóstico
  pelo banco antes disso: coluna NULL em `foto_url`/`banner_url` pode ser "ninguém
  salvou ainda", não regressão.
- **Competência escrita à mão é permitida; endosso não** (28/09, PR #40). O
  campo livre entrou em `normalizarNomeHabilidade` (`src/lib/habilidades.ts`) com
  teto de 32 caracteres e allowlist de caracteres, e o nome digitado que casa com
  a lista vira a **forma canônica** ("python" → "Python") — é o "Python" que a
  turma consegue endossar. O `+1` continua restrito às dez conhecidas nos dois
  lados: `apoiarHabilidadeAction` (`acoes-crm.ts`) recusa por
  `habilidadePermitida` e o `PerfilInterativo` não desenha o botão fora da
  allowlist. A PK de `public.endossos` é o **nome exato** da competência, então
  abrir o texto livre ali criaria lixo no banco. `habilidadePermitida` deixou de
  ser "o que pode existir no perfil" e virou só "o que pode receber +1".
- **Hierarquia entre `--faint` e `--dim` no tema escuro.** Efeito colateral de
  fazer o `--faint` passar AA: a distância entre os dois caiu de 1,85:1 para
  1,24:1 e, no mesmo corpo de fonte, os dois se leem como um. Onde dói:
  os chips de filtro de `/alunos` (contador de 13,6px em `--faint` ao lado do
  rótulo em `--dim` do mesmo tamanho) — o número perdeu o ar de badge. **Medido:
  o teto dessa distância respeitando AA é 1,43:1**, então não existe valor de
  token que resolva; quem precisa se destacar precisa de tratamento próprio
  (pill, fundo). Peça de design, para o Daniel.
- **Ícones 192 e 512 são wordmarks** (165x64 e 264x64) rotulados como quadrados no
  manifest. Peça de design, para o Daniel.
- **O mesmo wordmark no cabeçalho do login** desenha a linha "Serviço Social da
  Indústria" com ~7px de altura — o PNG de 264x64 vai à tela a 157x38, e a linha
  pequena fica ilegível. Junto disso, o "SESI" aparece duas vezes a 12,8px de
  distância, porque o título ao lado também diz "ALUNOS SESI". Medido por QA em
  29/09/2026. Ou vem um asset só com o wordmark (Daniel), ou o título perde o
  "SESI". Peça de design, não se resolve por conta.

- **Abertos pela revisão de 30/09, nenhum deles consertado** — todos medidos, e
  todos com o mesmo perfil: não são bug de tela hoje, são dívida com gatilho.
  (1) ~~**`retrato_salas` não filtra `aprovado`**~~ — **fechado em 30/09** pela
  migration `017_retrato_salas_aprovado.sql`. O filtro entrou na condição do JOIN
  (no `where`, a turma sem nenhum aprovado sumiria do ranking inteiro) e o
  `security_invoker = true` foi repetido, porque `create or replace view` **não
  herda** a opção e sem ela a view passaria a furar a RLS de quem consulta.
  **Aplicada em produção em 30/09/2026** (via `scripts/db-query.sh --psql`, depois
  de `--check` e `--dry-run`) e conferida por `curl` no HTML renderizado: `DSM3`
  aparece com 3 alunos e `2ºA` com 3 — os aprovados —, não 4, que é o total da
  tabela. A view prova `da_view` pelo `aprovados`, ao vivo.
  (2) ~~**`TURMAS_OFICIAIS` não existia na tabela `salas`**~~ — **medido em
  30/09/2026 e corrigido pela migration `018_turmas_oficiais.sql`.** O que a
  medição achou foi pior que a suspeita: das 9 turmas que o `<select required>` do
  cadastro oferece, existiam **duas** (`DSM3` e `DS4-25`). Seis delas
  (`DS1-25`, `DS2-25`, `DS1-26`, `DS2-26`, `DS1-24`, `DS2-24`) **bloqueavam o
  cadastro** com "Sala não encontrada", e `DSM3-25` matriculava o aluno em
  silêncio na linha duplicada `dsm3`, porque a busca tolerante por substring casa
  "dsm3" dentro de "dsm3-25". Nada disso aparecia antes porque o fallback antigo
  jogava tudo em "DSM3" — o aluno ia para a turma errada, calado. `registrarUsuario`
  **procura** a sala, não cria: é por isso que a lista do formulário e a tabela
  têm que casar. `tests/turmas.test.mjs` amarra as duas agora.
  **Aplicada em produção em 30/09/2026** (`--check`, `--dry-run`, `--psql`):
  inseriu 7 das 9 — `DSM3` e `DS4-25` já existiam e foram puladas pelo
  `on conflict`. As 9 opções do formulário agora se cadastram.
  (3) ~~**Constantes duplicadas**~~ — **fechado em 30/09**: as três foram para
  `src/lib/limites.ts` (`MAX_CARACTERES_TITULO_PROJETO`,
  `MAX_CARACTERES_DESCRICAO_PROJETO`, `MAX_BYTES_CAPA`), o módulo-folha sem
  `node:crypto` que o `seguranca.ts` já lia — era esse o motivo de a duplicação
  ser evitável, e não inevitável.
  (4) **O dropzone de capa de projeto promete "até 4MB"** e o teto real de
  `projetos` é 2 MB de data URL (~1,5 MB de imagem). O texto discorda do
  comportamento.
  (5) **Só o NOME da classe `selo-adm` ficou para trás.** O rótulo agora diz
  "Destaque" nas duas telas — o `/validar/[slug]` dizia "Destaque ADM" e foi
  corrigido em 30/09, porque o selo marca `aluno.destaque` e não um cargo. Fica
  devendo só o nome: renomear custa tocar em CSS e no
  `tests/classes-css.test.mjs`.
  (6) **`aprovarAluno` é check-then-set** (lê `aprovado`, grava o inverso): dois
  ADMs clicando junto podem não chegar ao estado esperado.
  (7) **A troca de turma que falha reverte em silêncio** no CRM: a revalidação
  corrige a lista, mas o ADM não recebe frase nenhuma. Dar a frase exige o form
  de cada linha virar um componente com `useActionState` (hoje é um `.map()`
  inline) — é peça nova, não remendo.
  (8) **`/api/upload` resolve o dono com slug chumbado** —
  `alunoPorSlug("theo-padilha") || alunoPorSlug("telor-de-espadilha")`
  (`upload/route.ts:93-97`), dois round-trips por upload de super_adm e a pasta
  amarrada a um perfil: se o slug for renomeado, o upload do ADM quebra.
  (9) **Nada disto foi exercido em navegador.** As correções de contraste (que
  mudam o desenho dos badges no tema claro, inclusive dentro do crachá e do
  cartão NFC), o upload de sticker pelo Blob e os dois guardas do banner foram
  verificados por cálculo, leitura e typecheck — não por olho na tela. Quem
  abrir o app em cada tema prova. Em 30/09 entrou mais coisa no mesmo balde: os
  números de contraste do endosso em `cracha-digital.css` foram **recalculados**
  (o pior fundo claro é 5,36:1, não os 6,68:1 que o comentário dizia), a guarda
  de `file.size` antes do `FileReader` no sticker, e o marcador "(linha atual)"
  no seletor de turma. O pixel continua não visto, e os números novos são
  aritmética conferida, não medição em tela.

  (10) ~~**Duas linhas de `salas` em produção**~~ — **fechado em 30/09/2026** pela
  migration `019_limpeza_de_salas.sql`. As duas foram medidas por leitura
  (`scripts/db-query.sh`) e **nenhuma tinha aluno**: `ac4f07c8-…` (`vai tomaar no
  cu`) e `4f9e33a0-…` (`dsm3`). O `delete` é guardado por `not exists (select 1
  from public.alunos where sala_id = s.id)` — se alguém tivesse matriculado nelas
  entre a medição e a aplicação, a linha fica. Ids e horários estão no cabeçalho
  da 019, para o caso de alguém precisar recriá-las. Com a `dsm3` fora, o par
  duplicado `dsm3`/`DSM3` deixou de existir — sobrou só a canônica maiúscula.
  (11) ~~**A busca tolerante do cadastro**~~ — **aplicada em 30/09/2026.** A
  direção `termo.includes(fold(s.nome))` foi removida de `auth.ts`; ficou só
  `fold(s.nome).includes(termo)`, que é a tolerância de verdade ("dsm" → "DSM3").
  Era ela que perguntava se o nome da sala cabia DENTRO do que veio no campo, e
  essa é a relação que produzia turma errada em silêncio ("dsm3" dentro de
  "dsm3-25"). O comentário no ponto explica o que saiu e por quê.

  (12) **O contador "N salas ativas" da vitrine conta sala vazia — e a 018 o
  inflou de 8 para 13.** É `{salas.length}` em `src/components/Vitrine.tsx:227`,
  sobre a lista inteira de `listarSalas`; o ranking logo abaixo **não** sofre,
  porque filtra `alunos > 0` (`:483`). O número subiu como efeito colateral de a
  018 criar as 7 turmas oficiais que faltavam — e os 8 de antes incluíam a linha
  `vai tomaar no cu`, então o valor nunca foi "salas em uso". **Não mexi de
  propósito:** num cabeçalho de vitrine, "13 salas" (a escola tem 13 turmas) e "5
  salas com alunos" são duas leituras defensáveis, e essa é decisão de produto.
  Se for para mudar, é uma linha: contar `retrato.filter((r) => r.alunos > 0)` em
  vez de `salas`. O `Vitrine` já trata `alunos > 0` como o corte do que vale
  mostrar, vinte linhas abaixo — o que é o argumento a favor da mudança.

**Why:** os itens "resolvidos" acima parecem bugs para quem lê o código depois —
trava de foco que prende o Tab, token claro demais, aba que não desmonta, perfil
que sumiu do Google. Sem esta nota, a próxima sessão "corrige" de volta uma decisão
tomada. E a pendência do `--faint` parece fácil de resolver mexendo no token: não é,
a conta já foi feita e o teto é 1,43:1.

**How to apply:** ao tocar em qualquer um destes, leve isto e peça a decisão — não
aplique por conta. Ver [[infra-deploy]] para o fluxo de PR/deploy.
