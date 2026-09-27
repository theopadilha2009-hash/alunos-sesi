---
name: pendencias-de-decisao
description: "O que continua pendente por ser decisão (design/produto) e o que ficou decidido nesta rodada — pra ninguém \"consertar\" de volta o que foi decidido"
metadata:
  node_type: memory
  type: project
  originSessionId: 19e12991-e45f-4f11-b062-9aa898ea5c51
  modified: 2026-09-25T22:22:43.233Z
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

**Continua aberto:**

- **O teto de corpo do POST do editor é 11,6× o que o Next aceita** (medido em
  27/09, no review do PR #21). A soma máxima teórica dos campos é 46,3 MiB
  contra o `bodySizeLimit` de 4 MB (`next.config.ts`), e não é preciso chegar
  perto: **duas mídias no teto de 2 MB somam exatamente 4.194.304 B**, e com o
  multipart já estoura. Quando estoura, o Next recusa **antes da action** — sem
  descarte e sem mensagem: o aluno cai no error boundary ("Algo inesperado
  aconteceu") e perde a edição inteira, inclusive a capa que estava válida. Não
  existe guarda de soma no cliente; `conferirTamanhoDaImagem` mede item a item.
- **O caminho novo do perfil nunca foi exercido com dado real** (25/09): ninguém
  editou o perfil ainda, então `foto_url` e `habilidades` estão NULL para todos
  os alunos e o upload de foto / escolha de competências só foi coberto por
  typecheck e testes de unidade. O primeiro a salvar o perfil pelo CRM prova
  isso — não escrevi em dado de aluno de produção para testar. Verificado em
  27/09: `cor_perfil` e `banner_url` (PR #21) nascem na mesma situação, e os
  contatos do Théo (instagram, github, linkedin e e-mail) estão preenchidos.
- **A Onda 2 (mídias → Vercel Blob) trava em duas decisões** (27/09). Nenhum
  store está conectado ao projeto (`vercel blob list-stores` volta vazio), mas o
  CLI **está autenticado** (`theopadilha2009-5085`): `vercel blob create-store`
  roda sem login interativo, então o bloqueio não é técnico. Falta decidir
  criar o recurso (tem custo por uso) e desenhar a migração das mídias que já
  estão em base64 no JSONB. Cadastrar `BLOB_READ_WRITE_TOKEN` na Vercel é passo
  manual no dashboard: o `scripts/vercel-env.sh` só faz `pull`/`list`/`deploy`.
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

**Why:** os itens "resolvidos" acima parecem bugs para quem lê o código depois —
trava de foco que prende o Tab, token claro demais, aba que não desmonta, perfil
que sumiu do Google. Sem esta nota, a próxima sessão "corrige" de volta uma decisão
tomada. E a pendência do `--faint` parece fácil de resolver mexendo no token: não é,
a conta já foi feita e o teto é 1,43:1.

**How to apply:** ao tocar em qualquer um destes, leve isto e peça a decisão — não
aplique por conta. Ver [[infra-deploy]] para o fluxo de PR/deploy.
