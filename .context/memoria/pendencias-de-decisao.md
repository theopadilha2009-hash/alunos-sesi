---
name: pendencias-de-decisao
description: "O que continua pendente por ser decisão (design/produto) e o que ficou decidido nesta rodada — pra ninguém \"consertar\" de volta o que foi decidido"
metadata:
  node_type: memory
  type: project
  originSessionId: 19e12991-e45f-4f11-b062-9aa898ea5c51
  modified: 2026-09-29T21:56:09.000Z
---

Levantado em 2026-09-25, ao fechar a onda 3/4. Nada aqui é oversight: cada item foi
identificado e medido. Os que sobraram esperam decisão; os que fecharam estão aqui
pelo motivo inverso — parecem bug pra quem lê o código depois.

**Já resolvido, não reabra sem falar com o Ruan:**

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

**Continua aberto:**

- **`src/lib/dados.ts` interpola `.message` em 10 pontos** (achado da revisão do
  PR #60). `throw new Error(\`...: ${error.message}\`)` em `:58,144,219,323` e
  vizinhos. Não vaza no browser em produção — o Next sanitiza a mensagem de erro
  de Server Component — mas é a mesma matéria-prima do vazamento que o #60
  fechou, e é o que faria uma varredura estendida a `src/` falhar. Fechar exige
  decidir o que cada um desses `throw` deve dizer na tela; não é o mesmo caso do
  `/api/estrela`, onde a resposta ia crua para o cliente.
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
- **`btn-ver-autor` é o único defeito de tela do cluster de classes sem CSS**
  (medido em 29/09, no PR #61). O cluster inteiro agora está **medido e travado**:
  são **32 classes órfãs em 760 usadas**, classificadas por motivo em
  `tests/classes-css.test.mjs` (INLINE, BASE, TEXTO, CAIXA, SEM_ESTILO), e o
  teste falha nas duas direções — órfã nova não classificada e classe da lista
  que ganhou CSS. Das 32, **uma só é defeito visível**: `btn-ver-autor`
  (`CrmApp.tsx:938`) é um `<button>` sem classe base nenhuma, então recebe o
  visual default do navegador (fundo claro, borda, fonte do sistema) dentro de um
  card escuro do CRM — mesma família do `textarea-bio`, que foi o bug que originou
  a varredura. **O conserto é de design** (qual classe da casa ele usa), e por
  isso não entrou; se for o caminho óbvio, precisa das **duas** classes:
  `.botao-fraco` sozinha não dá padding nem borda (só cor), então
  `className="botao botao-fraco btn-ver-autor"`. As outras 31 são cosméticas: 6
  têm o visual em `style` inline, 4 acompanham classe viva que já estiliza, 9 são
  texto que herda tipografia, e 12 são containers com filhos estilizados — esses
  12 são o grupo que pede decisão de design, não conserto mecânico. O `vazio-suave`
  é o mais visível deles, mas aparece em **três seções da mesma tela** (`Meu
  Perfil`: criações, galeria e vídeos), não em três telas.
- **`/api/health` é público e sem rate limit** (29/09). Uma query no Supabase por
  chamada; não há `middleware.ts` e o `src/proxy.ts` não trata essa rota. Não
  apliquei `verificarRateLimit` de propósito: monitoramento bate nele em intervalo
  curto e um 429 derrubaria o próprio monitor. Decisão de infra, não fix.
- **`role: "adm"` é inerte no gate** (29/09). O valor existe no schema
  (`003_crm_auth.sql`) e no tipo, mas `podeAdmin` só aceita crachá válido ou
  `super_adm` — quem tem `role="adm"` não abre `/adm` sem o cookie do crachá. Não
  é regressão (é igual desde antes desta leva), mas é valor sem consumidor: quem
  for usar `adm` de verdade precisa mexer no gate.

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
  o do envoltório. Sem teste: não há jsdom na suíte e o `renderToStaticMarkup`
  esbarraria nos aliases `@/`. **Fica aberto, como design:** o selo visível ao
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
- **`noUnusedLocals` está off, e a família é maior do que parece** (29/09).
  Três revisores esbarraram em import morto — `IconeCopiar` (#52), `CartaoAluno`
  (#54) e onze de uma vez (#57) — e nenhum deles é visível para o `tsc` como o
  projeto está configurado (e não há lint).
  Medido, não estimado: `--noUnusedLocals` sozinho acusa **24**;
  `--noUnusedParameters` junto leva a **29**, e a diferença não é detalhe —
  são **cinco props recebidas e nunca lidas**, que podem ser recurso morto e não
  código morto: `onSelecionarAluno` (`PainelAdmIntegrado.tsx:72`), `usuario`
  (`MuralDesafios.tsx:39`), `retrato` (`CrmApp.tsx:73`), `salas`
  (`PaginaMeuPerfil.tsx:89`) e `compacto` (`TemaToggle.tsx:16`). Duas delas são
  **obrigatórias** na assinatura, então removê-las mexe em quem chama — é a
  decisão cara que a flag não toma sozinha. O resto dos 29 se reparte em 17
  imports mortos e 7 locais mortos (`db`, `setDesafios`, `setSala`,
  `setNovaMidiaTipo`, `totalFixados`, `github`, `linkedinHandle`).
  *(A primeira versão deste parágrafo dizia "três props"; a revisão do próprio
  texto mediu cinco. O número errado está corrigido aqui.)*
  Ligar a flag transforma a família em falha de CI — é o conserto estrutural, e
  é decisão de time. Recomendação: ligar `noUnusedLocals`, limpar os 24 e tratar
  as cinco props numa conversa à parte.
  **Cuidado ao limpar os 24**: nem tudo que a flag chama de morto é lixo.
  `const db = clienteAdmin()` (`acoes-crm.ts:241`) é binding morto **e** é um
  fail-fast — `clienteAdmin` lança quando falta `NEXT_PUBLIC_SUPABASE_URL` ou
  `SUPABASE_SERVICE_ROLE_KEY` (`supabase/admin.ts:14-18`), e apagar a linha
  troca uma explosão alta e imediata por uma falha mais tarde e mais obscura. A
  linha 343 do mesmo arquivo tem a mesma chamada, essa usada de verdade.

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

**Why:** os itens "resolvidos" acima parecem bugs para quem lê o código depois —
trava de foco que prende o Tab, token claro demais, aba que não desmonta, perfil
que sumiu do Google. Sem esta nota, a próxima sessão "corrige" de volta uma decisão
tomada. E a pendência do `--faint` parece fácil de resolver mexendo no token: não é,
a conta já foi feita e o teto é 1,43:1.

**How to apply:** ao tocar em qualquer um destes, leve isto e peça a decisão — não
aplique por conta. Ver [[infra-deploy]] para o fluxo de PR/deploy.
