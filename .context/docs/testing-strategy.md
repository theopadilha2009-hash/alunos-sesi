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

Só as funções puras de `src/lib/`. **208 testes em 13 arquivos**, todos em
`node:test` + `node:assert/strict`, sem rede e sem banco:

| Arquivo | Módulo | O que os testes travam |
|---|---|---|
| `puros.test.mjs` (29) | `busca`, `links`, `slug`, `importar`, `ranking` | `fold` ignora acento e caixa; `3ºA`/`3oA`/`3A` caem na mesma busca; `filtrarAlunos` não vaza outra sala e o atalho `ESTRELADOS` ignora o filtro; `normalizarGithub`/`normalizarLinkedin`; `slugificar`/`slugUnico`; `parseLista`; `ordenarAlunos`/`rankingSalas` |
| `seguranca.test.mjs` (69) | `seguranca` | `compararTempoConstante`; `urlSegura`/`urlImagemSegura` (esquemas e data URL); `sanitizarTexto`; `verificarRateLimit`; `sanitizarProjetos`/`sanitizarMidias` e a moderação de bio, habilidade, legenda e título de vídeo |
| `limites.test.mjs` (16) | `limites` | os tetos por campo e `descreverDescartes`, que agrupa o descarte por motivo e campo sem confundir capa perdida com projeto perdido |
| `blob.test.mjs` (15) | `blob` | `nomeDaImagem` pela extensão do MIME; `blobDoDataUrl` (incluindo bytes acima de 127, que o `atob` devolveria corrompidos); as recusas de `caminhoPertenceAoAluno` |
| `video.test.mjs` (15) | `video` | `normalizarVideo`: formas do YouTube e do Vimeo, host que só *parece* o da plataforma, `http:` recusado, `youtube-nocookie` no embed e o `frame-src` fechado |
| `csp.test.mjs` (15) | `csp` | o nonce do `script-src`, o `style-src` sem nonce, `unsafe-eval` só em dev, `upgrade-insecure-requests` só em produção, e a fonte que cobre a **forma real** do host do Blob |
| `sessao.test.mjs` (11) | `sessao` | ida e volta por propósito, a subchave HKDF que não abre em outro, a adulteração de qualquer byte e o token que devolve `null` em vez de explodir |
| `senha.test.mjs` (8) | `senha` | `hashSenha` sai argon2id e nunca em claro; hash malformado não derruba a verificação nem autentica |
| `habilidades.test.mjs` (8) | `habilidades` | `habilidadePermitida` aceita só o nome exato da lista e `extrairHabilidades` respeita o teto |
| `insignias.test.mjs` (8) | `insignias` | a escada fixa das seis, cada limiar acendendo só a sua, e progresso que nunca passa do alvo |
| `foco.test.mjs` (6) | `foco` | o ciclo de Tab e Shift+Tab preso no diálogo, e a ponta por onde o foco entra |
| `cores.test.mjs` (4) | `cores` | `corDaSala` estável; `corDoAluno` que prefere a escolha; a paleta do app é a mesma lista do `CHECK` no banco |
| `github.test.mjs` (4) | `github` | `tituloDoRepo`, `descricaoDoRepo` e `quandoDoRepo` |

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
é testado direto por `seguranca.test.mjs`, com 69 testes. O que não pode é um
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
