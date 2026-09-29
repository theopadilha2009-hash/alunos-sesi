---
name: pendencias-de-decisao
description: "O que continua pendente por ser decisão (design/produto) e o que ficou decidido nesta rodada — pra ninguém \"consertar\" de volta o que foi decidido"
metadata:
  node_type: memory
  type: project
  originSessionId: 19e12991-e45f-4f11-b062-9aa898ea5c51
  modified: 2026-09-28T19:35:00.000Z
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
  conteúdo **antigo** achando que tinha mandado o link. Era a única das seis telas
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
  altura, o painel "Ativar" passa a rolar 33px, onde antes cabia. Reservar a
  altura do maior painel foi descartado: custaria 276px de espaço morto em toda
  aba. A mesma leva encurtou o rótulo da terceira aba para "Ativar" — ver
  [[acesso-por-codigo]].

**Continua aberto:**

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
