---
type: doc
name: testing-strategy
description: Test frameworks, patterns, coverage requirements, and quality gates
category: testing
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Estratégia de testes

## O que é testado

Só as funções puras de `src/lib/`, mais as varreduras de código-fonte que travam
uma regra que nenhum tipo segura. Tudo em `node:test` + `node:assert/strict`,
sem rede e sem banco:

> O total não está escrito aqui de propósito. Ele já envelheceu duas vezes numa
> única leva de trabalho — o número foi corrigido para 297 e uma rodada de
> review somou dois testes no mesmo PR. Quem quer o total pergunta ao runner
> (`npm test`); esta página diz **o que** cada suíte trava.

| Arquivo | Módulo | O que os testes travam |
|---|---|---|
| `seguranca.test.mjs` (72) | `seguranca` | `compararTempoConstante`; `urlSegura`/`urlImagemSegura` (esquemas e data URL); `sanitizarTexto`; `verificarRateLimit`; `sanitizarProjetos`/`sanitizarMidias`/`sanitizarStickers` (clamp de posição, tamanho e rotação, o orçamento de bytes dos data URL); `sanitizarHabilidades`, que aceita competência escrita à mão desde a `009`; `sanitizarFoto`/`sanitizarCapa`/`sanitizarCor`/`sanitizarEmail`; `sanitizarVideos` |
| `puros.test.mjs` (29) | `busca`, `links`, `slug`, `importar`, `ranking` | `fold` ignora acento e caixa; `3ºA`/`3oA`/`3A` caem na mesma busca; `filtrarAlunos` não vaza outra sala e o atalho `ESTRELADOS` ignora o filtro; `normalizarGithub`/`normalizarLinkedin`; `slugificar`/`slugUnico`; `parseLista`; `ordenarAlunos`/`rankingSalas` |
| `lacunas.test.mjs` (17) | `lacunas` | o que conta como perfil incompleto (vazio e ausente contam; bio só de espaços conta como vazia), `filtrarPorLacuna`/`contarLacunas` e o rótulo de tela de cada lacuna |
| `limites.test.mjs` (16) | `limites` | os tetos por campo e `descreverDescartes`, que agrupa o descarte por motivo e campo sem confundir capa perdida com projeto perdido |
| `blob.test.mjs` (15) | `blob` | `nomeDaImagem` pela extensão do MIME; `blobDoDataUrl` (incluindo bytes acima de 127, que o `atob` devolveria corrompidos); as recusas de `caminhoPertenceAoAluno` |
| `csp.test.mjs` (15) | `csp` | o nonce do `script-src`, o `style-src` sem nonce, `unsafe-eval` só em dev, `upgrade-insecure-requests` só em produção, e a fonte que cobre a **forma real** do host do Blob |
| `desafios.test.mjs` (15) | `desafios` | `parseCriterios` (uma linha por critério, o `\r` do Windows fora, teto) e a validação de publicação: categoria inventada é recusada, título que não rende slug também — mas o título que é literalmente "Aluno" passa |
| `video.test.mjs` (15) | `video` | `normalizarVideo`: formas do YouTube e do Vimeo, host que só *parece* o da plataforma, `http:` recusado, `youtube-nocookie` no embed e o `frame-src` fechado |
| `ativacao.test.mjs` (13) | `ativacao` | o alfabeto Crockford Base32 (sem as letras que se confundem); o código entra com ou sem o prefixo SESI, com hífen e espaço a mais; a dobra das letras ambíguas acontece **depois** de tirar o prefixo; o hash é determinístico e não deixa o código aparecer |
| `habilidades.test.mjs` (13) | `habilidades` | `habilidadePermitida` aceita só o nome exato da lista (é a allowlist do endosso, não a do perfil); `extrairHabilidades` respeita o teto; `normalizarNomeHabilidade` |
| `sessao.test.mjs` (14) | `sessao` | ida e volta por propósito, a subchave HKDF que não abre em outro, a adulteração de qualquer byte e o token que devolve `null` em vez de explodir; `podeAdmin`, que é `crachaValido` **ou** `super_adm` — a regra que estava copiada em três telas |
| `username.test.mjs` (10) | `username` | `normalizarUsername` e os limites do banco, com o e-mail institucional aceito onde o cadastro antes recusava |
| `identidade.test.mjs` (9) | `identidade` | a matrícula é estável — a mesma entrada dá o mesmo número, e ele não muda com estrelas nem com edição de perfil. Roda fora do servidor porque o crachá é desenhado no navegador |
| `insignias.test.mjs` (8) | `insignias` | a escada fixa das seis, cada limiar acendendo só a sua, e progresso que nunca passa do alvo |
| `senha.test.mjs` (8) | `senha` | `hashSenha` sai argon2id e nunca em claro; hash malformado não derruba a verificação nem autentica |
| `estrela.test.mjs` (6) | `estrela` | `lerRespostaEstrela` traduz a resposta da rota — o motivo que o servidor deu, o 200 sem os campos, a mensagem própria quando ele não explica — e `motivoParaNaoEstrelar` barra o perfil pendente |
| `foco.test.mjs` (6) | `foco` | o ciclo de Tab e Shift+Tab preso no diálogo, e a ponta por onde o foco entra |
| `importacao.test.mjs` (7) | `importacao` | `tomDaImportacao`: a planilha que não mudou nada não é sucesso (reimportar a lista inteira pintava banner vermelho de erro), erro junto de criação é atenção, e o tom devolvido é sempre um que o CSS conhece. Mais a varredura que confere **a classe** de cada tom contra as declaradas nos dois CSS: o tom de sucesso vira `recado-ok`, não `recado-sucesso` (que não existe e deixava a importação bem-sucedida sem cor em `/adm`) |
| `cores.test.mjs` (4) | `cores` | `corDaSala` estável; `corDoAluno` que prefere a escolha; a paleta do app é a mesma lista do `CHECK` no banco |
| `datas.test.mjs` (3) | `datas` | a data no padrão brasileiro, o lixo que devolve `null` e o fuso fixo em São Paulo — não o de quem roda o código |
| `github.test.mjs` (3) | `github` | `tituloDoRepo` (com o corte no teto de 80), `descricaoDoRepo` e `quandoDoRepo` |
| `endosso.test.mjs` (1) | varredura | não testa módulo nenhum: lê os `.tsx` de `src/components/` (só ali) e exige que **cada** ocorrência de `btn-endorsement-add` tenha um `habilidadePermitida(` nas 500 letras anteriores **e não esteja no ramo do `:` do ternário** — o ramo é decidido contando parênteses/chaves/colchetes até a classe, com string e comentário pulados inteiros (sem isso, um `")"` no ramo do `true` escondia o `:` e aprovava o botão do ramo errado; proibir qualquer `:` reprovava botão correto com `style`/`title` antes do `className`), e o matcher é **sem** a flag `g`, porque compartilhado com a varredura o `lastIndex` do `.test` fazia o laço pular o arquivo seguinte em silêncio. Até 29/09 a conta era por arquivo e passava com o guard em qualquer lugar. O que resta fora: o `+1` desenhado sem essa classe, o que estiver fora de `src/components/`, um guard que esteja ali por outro motivo, o `\"`/regex literal dentro do trecho, e — o único silencioso — aspa solta em texto JSX (`<span>aluno's</span>`), que compila e engana a contagem; não existe no repo, e o caminho para fechar é o parser TSX, não mais uma regra de caractere |

As contagens são de declarações `test(` no arquivo, não do que o `npm test`
imprime: quem quiser o total de verdade pergunta ao runner, não a esta tabela —
que envelhece a cada teste novo.

Os testes cobrem os pontos onde o comportamento é sutil e barato de errar:
normalização de link colado, parser de planilha, desempate estável, o `fold` do
`º` (U+00BA, que o NFD não decompõe) e as fronteiras de segurança — o caminho
do upload, a allowlist de host do vídeo e a fonte da CSP.

## Comando

```bash
npm test        # node --experimental-strip-types --test tests/*.test.mjs
npm run typecheck   # next typegen && tsc --noEmit
npm run build
```

Não há runner instalado (nem Vitest, nem Jest): o teste usa o `node:test` que
já vem no Node 22 do CI. A flag `--experimental-strip-types` é o que permite
importar os `.ts` de `src/lib/` sem compilar.

## Por que os módulos são folha

O type-stripping do Node **não reescreve especificador de import**: `from
"./busca"` (sem extensão) não resolve, e o alias `@/lib/busca` também não. O
que resolve é o que o Node acha sozinho:

- `node:*` (`node:crypto`, `node:test`) e pacotes de `node_modules`
  (`react`, `@node-rs/argon2`);
- import relativo **com a extensão `.ts` escrita** — `from "./cores.ts"`;
- `import type`, que o strip apaga antes de virar import em runtime.

Então a regra não é "não importa nada", e sim **não importar por um
especificador que o Node não resolva**. Uma cadeia é permitida — `seguranca.ts`
importa `./cores.ts`, `./habilidades.ts` e `./video.ts` (todos com extensão) e
é testado direto por `seguranca.test.mjs`. O que não pode é um
`from "@/lib/dados"` no meio da cadeia.

A base continua folha por isso: `busca.ts`, `blob.ts`, `cores.ts`, `csp.ts`,
`debug.ts`, `github.ts`, `habilidades.ts`, `importar.ts`, `insignias.ts`,
`limites.ts`, `links.ts`, `ranking.ts`, `slug.ts`, `som.ts`, `tema.ts` e
`video.ts` não importam nada do projeto.

Já `dados.ts`, `tipos.ts` e `supabase/*` importam à vontade — eles não são
testados direto.

## O que NÃO é testado automaticamente

- **Server Actions**: `src/app/adm/acoes.ts` (`importarLista`, `criarAluno`,
  `removerAluno`, `alternar`) e `src/app/acoes-crm.ts` (login, salvar perfil,
  projetos). Dependem de `cookies()`, de `revalidatePath` e do cliente admin.
- **Route Handlers**: `/api/estrela`, `/api/upload` e `/adm/[chave]`.
- **`src/proxy.ts`** — a emissão do cookie do visitante e a CSP na resposta.
- **Toda a leitura do Supabase** (`src/lib/dados.ts`) e a RLS de `src/sql/`.
- **Componentes de React**, incluindo o voto otimista de `Vitrine.tsx` e o
  recorte de imagem do editor. Não há jsdom nem Testing Library instalados.

O CI não tem banco: `.github/workflows/ci.yml` sobe só Node, roda typecheck,
testes e build, este último com valores de mentira nas variáveis de ambiente
(o comentário no workflow diz que nada ali conecta).

## Como as partes sem teste são conferidas

À mão, contra o projeto Supabase de verdade, porque é onde a maior parte do
risco mora:

1. **Fluxo no browser**, com `npm run dev`: dar estrela e ver o número subir,
   clicar de novo para tirar, recarregar e conferir que o estado persistiu, e
   votar duas vezes no mesmo aluno para ver que o contador não anda duas vezes.
2. **Link secreto**: abrir `/adm/<ADM_CHAVE>` e confirmar que a URL vira `/adm`
   e que a chave sumiu da barra; abrir `/adm` numa janela limpa e confirmar
   **404**, não uma tela de login; abrir `/adm/<chave-errada>` e confirmar 404.
3. **Painel**: colar a lista da turma mesmo (a prévia roda no navegador antes
   de aplicar), conferir a contagem de novos/completados/ignorados, fixar e
   destacar um aluno e ver a mudança na vitrine, e reimportar a mesma lista
   para confirmar que nada é sobrescrito.
4. **Upload de mídia**: entrar como aluno, subir uma imagem e conferir que a
   URL do Blob entrou no formulário e que ela **não** caiu na pasta de outro
   aluno; tentar um arquivo acima do teto e ver a recusa antes de subir.
5. **Schema**: `./scripts/db-query.sh --check -f src/sql/<n>_<nome>.sql` para o
   lint offline e `--dry-run --force -f` para executar de verdade dentro de uma
   transação com `ROLLBACK`, que pega erro de sintaxe, FK e constraint que
   regex não pega.

Um schema errado não aparece em teste nenhum: a RLS de `votos` e a view
`retrato_salas` só se provam consultando o banco.

## Gates

| Gate | Onde | Bloqueia |
|---|---|---|
| `npm run typecheck` | CI e local | sim |
| `npm test` | CI e local | sim |
| `npm run build` | CI e local | sim |
| lint de SQL (`--check`) | antes de aplicar migration | sim (exit 2) |
| `--dry-run` do SQL | antes de aplicar migration | sim |

Não há meta de cobertura. A regra prática é: regra de negócio pura nova em
`src/lib/` entra com teste próprio, `tests/<modulo>.test.mjs`; o resto se
confere no browser e no banco.
