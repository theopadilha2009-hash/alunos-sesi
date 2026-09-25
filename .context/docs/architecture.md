---
type: doc
name: architecture
description: System architecture, layers, patterns, and design decisions
category: architecture
generated: 2026-09-25
status: filled
scaffoldVersion: "2.0.0"
---

# Arquitetura

Um app Next.js só, com três produtos na mesma base: a vitrine pública, o CRM
escolar com login e as páginas de identidade por aluno. Não há backend separado,
fila, cron ou serviço próprio: as páginas de servidor leem direto do Supabase e
toda escrita passa por Server Actions e Route Handlers.

## Stack

| Camada | O que é | Onde |
|---|---|---|
| Framework | Next 16.3.5, App Router | `src/app/`, `next.config.ts` |
| UI | React 19.2.8, CSS puro com custom properties | `src/components/`, `src/app/styles/` |
| Tipos | TypeScript strict, `next typegen && tsc --noEmit` | `tsconfig.json` |
| Dados | Supabase (Postgres + RLS), `@supabase/supabase-js` ^2.58 | `src/lib/supabase/`, `src/sql/` |
| Senhas | `@node-rs/argon2` ^2.2.1 (addon nativo) | `src/lib/senha.ts` |
| Extras | `qrcode`, `canvas-confetti`, `@vercel/analytics` | `package.json` |
| Testes | `node:test` com `--experimental-strip-types` | `tests/*.test.mjs` |
| Deploy | Vercel (ligada ao GitHub) | `.github/workflows/ci.yml` |

Oito dependências de runtime: `next`, `react`, `react-dom`,
`@supabase/supabase-js`, `@node-rs/argon2`, `qrcode`, `canvas-confetti` e
`@vercel/analytics`. `@node-rs/argon2` precisa de
`serverExternalPackages: ["@node-rs/argon2"]` no `next.config.ts` — sem isso o
binário `.node` entra no bundle e o build quebra.

As Server Actions aceitam corpo de até 4 MB (`serverActions.bodySizeLimit`),
que é o teto do upload de mídia em base64; `urlImagemSegura` corta data URL em
2 MB do lado do servidor.

## Mapa de rotas

| Rota | Arquivo | Tipo | Quem entra |
|---|---|---|---|
| `/` | `src/app/page.tsx` | página (server, `force-dynamic`, noindex) | qualquer um — sem sessão, vê o `LoginTela`; com sessão, o `CrmApp` |
| `/alunos` | `src/app/alunos/page.tsx` | página (server) | qualquer um; indexável |
| `/alunos/[slug]` | `src/app/alunos/[slug]/page.tsx` | página (server) | qualquer um; indexável, é o crachá digital + portfólio |
| `/u/[slug]` | `src/app/u/[slug]/page.tsx` | página (server, noindex) | qualquer um; é o destino do cartão NFC / link na bio |
| `/validar/[slug]` | `src/app/validar/[slug]/page.tsx` | página (server, noindex) | qualquer um; conferência de matrícula |
| `/adm` | `src/app/adm/page.tsx` | página (server, noindex) | só com o crachá `sesi.adm` ou sessão `super_adm`; sem isso, `notFound()` |
| `/adm/[chave]` | `src/app/adm/[chave]/route.ts` | Route Handler `GET` | quem tem a chave; emite o crachá e sai por redirect 303 |
| `/api/estrela` | `src/app/api/estrela/route.ts` | Route Handler `POST`/`DELETE` | qualquer visitante com cookie assinado |
| `/api/health` | `src/app/api/health/route.ts` | Route Handler `GET` | qualquer um; `200` ou `503` conforme o banco |
| `/robots.txt` | `src/app/robots.ts` | metadata route | bloqueia `/adm`, `/api/`, `/u/`, `/validar/` |
| `/sitemap.xml` | `src/app/sitemap.ts` | metadata route (`force-dynamic`) | anuncia `/alunos` e um URL por aluno, e só |
| `/manifest.webmanifest` | `src/app/manifest.ts` | metadata route | manifest do PWA |

Arquivos de fronteira do App Router: `layout.tsx` (raiz), `error.tsx`,
`global-error.tsx` e `not-found.tsx`. Não há `loading.tsx`: os seis esqueletos
de navegação que existiam foram removidos porque o Suspense commitava `200`
antes do `notFound()` e engolia o 404 real das rotas dinâmicas.

### O que cada rota faz

- **`/`** — a porta do CRM. `obterSessao()` decide: sem sessão, devolve
  `LoginTela` (login e cadastro); com sessão, carrega alunos, salas, retrato e
  desafios em paralelo e monta o `CrmApp`. É `force-dynamic` e `noindex` de
  propósito: anunciá-la fazia o Google receber um sitemap que o próprio HTML
  mandava não indexar.
- **`/alunos`** — a vitrine: busca sem acento, filtro por sala ou por
  habilidade, atalho "meus estrelados", tabela, retrato da turma e ranking das
  salas. Falha de leitura vira mensagem de erro, nunca lista vazia.
- **`/alunos/[slug]`** — o crachá digital e o portfólio do aluno
  (`PerfilInterativo`): QR code do próprio URL, download do crachá em PNG, apoio
  de competências (+1), projetos, mídias e o mini-currículo A4.
- **`/u/[slug]`** — o cartão NFC / link na bio: stickers posicionados por
  porcentagem, competências com contagem de apoios, e a lista de botões (crachá,
  validação, LinkedIn, GitHub, Instagram, mini-currículo). Sem indexação —
  expõe contato do aluno e é alcançada por aproximação, não por busca.
- **`/validar/[slug]`** — a página de conferência: quem recebe o documento
  apresentado abre aqui e vê o selo verde de matrícula ativa. Sem indexação, pelo
  mesmo motivo do `/u/[slug]`.
- **`/adm`** — o painel cru: importação em massa, cadastro de um aluno,
  fixar, destacar e remover.

Sobre `/validar/[slug]`: o número de matrícula e o "hash SHA-256 de integridade"
são **derivados na hora**, de `slug`, `estrelas` e `id` — não existem coluna nem
verificação no banco. Servem para a página parecer um documento, não para
autenticar nada.

## Divisão de camadas

| Pasta | Papel | Regra |
|---|---|---|
| `src/app/` | rotas, Server Actions (`acoes-crm.ts`, `adm/acoes.ts`) e Route Handlers | orquestra; não guarda regra de domínio |
| `src/lib/` | domínio e acesso a dados | nada de JSX; nenhum componente importa o Supabase direto |
| `src/components/` | UI | recebe props prontas; não fala com o banco |
| `src/sql/` | schema versionado, em 8 migrations | numeradas na ordem de aplicação |
| `tests/` | testes das funções puras | roda no `node --test`, sem banco |

A regra que sustenta a divisão: **tela não conhece Supabase**. Quem lê e escreve
no banco é `src/lib/dados.ts` e `src/lib/auth.ts`, e só eles importam
`supabase/admin.ts` ou `supabase/publico.ts`.

## Os módulos de `src/lib/`

| Módulo | LOC | Em uma linha |
|---|---|---|
| `auth.ts` | 319 | Sessão do usuário: token assinado com `iat`/`exp`, login com argon2id + rate limit duplo (conta e IP), cadastro, logout |
| `dados.ts` | 277 | A única ponte entre tela e Supabase: leituras públicas, perfil, endosso, submissão de desafio, votos do visitante |
| `seguranca.ts` | 324 | Sanitização (XSS, URL, data URL, JSONB de projetos/mídias/stickers), comparação em tempo constante e o rate limit em memória |
| `exportar-cracha.ts` | 241 | Gera o crachá em PNG 2x via Canvas nativo, no cliente |
| `importar.ts` | 149 | Parser tolerante da lista colada no ADM (tab, vírgula ou ponto e vírgula) |
| `som.ts` | 129 | Som de estrela e confetes, com gate de mute persistido e `prefers-reduced-motion` |
| `sessao.ts` | 120 | Os três cookies assinados (`visitante`, `adm`, `usuario`), cada um com sua subchave HKDF |
| `senha.ts` | 112 | Hash e verificação argon2id, SHA-256 legado com rehash no login, `HASH_FANTASMA` e `SENHA_BLOQUEADA` |
| `tipos.ts` | 107 | Os tipos do domínio: `Aluno`, `AlunoNaTela`, `Sala`, `RetratoSala`, `DesafioHackathon`, `StickerPerfil`, `UsuarioSessao` |
| `habilidades.ts` | 96 | Taxonomia de competências (`LISTA_HABILIDADES`) e extração por regex a partir da bio |
| `rate-limit.ts` | 96 | Limitador que sobrevive ao cold start (tabela `tentativas`) e `ipDoCliente()` |
| `debug.ts` | 95 | `logger` estruturado com máscara automática de segredos e `medirOperacao` |
| `busca.ts` | 91 | Busca sem acento (`fold`, `matches`, `filtrarAlunos`) e os sentinelas `TODAS` / `ESTRELADOS` |
| `links.ts` | 78 | Normaliza LinkedIn e GitHub para a forma canônica, dá `URL_BASE` e `iniciais()` |
| `tema.ts` | 59 | Aplica o `data-theme` e a cor da barra do PWA |
| `csp.ts` | 67 | O texto da Content-Security-Policy e o nome dos headers de nonce |
| `ranking.ts` | 54 | Ordenação da vitrine com desempate determinístico e o ranking das salas |
| `slug.ts` | 34 | `slugificar` e `slugUnico` — o endereço legível do perfil |
| `cores.ts` | 26 | A cor da sala, por hash do nome sobre as quatro cores do símbolo |
| `abas.ts` | 25 | `aoSetasDasAbas`: navegação por setas dentro de `[role="tablist"]`, usada pelo login, pelo painel do ADM e pelo perfil |
| `supabase/publico.ts` | 22 | Client com a anon key — passa pela RLS de propósito |
| `supabase/admin.ts` | 22 | Client com a service_role — atravessa a RLS, só no servidor e depois do crachá |

## Separação server/client

Server por padrão. Dezenove componentes são `"use client"`, mais os dois error
boundaries:

- **Vitrine e crachá:** `Vitrine`, `CartaoAluno`, `TabelaAlunos`, `CommandBar`,
  `CrachaModal`, `CurriculoImpressao`, `PerfilInterativo`, `TopProjetosTurma`,
  `RedesBadges`, `TemaToggle`.
- **ADM:** `adm/FormAluno`, `adm/ImportarLista`.
- **CRM:** `crm/CrmApp`, `crm/LoginTela`, `crm/PaginaMeuPerfil`,
  `crm/PainelAdmIntegrado`, `crm/MuralDesafios`, `crm/ModalPerfilBreve`,
  `crm/StickerCanvas`.

`src/lib/exportar-cracha.ts` também é `"use client"` — mexe em Canvas e
`@node-rs/argon2` não tem nada com isso.

São de servidor, entre outros, `ds.tsx` (`Topo`/`Rodape`/`Vazio`), `Icones.tsx`,
`Roseta.tsx` e `adm/PainelAlunos.tsx`: cada botão do painel é um
`<form action={alternar}>` / `<form action={removerAluno}>`, então ele funciona
sem JavaScript no cliente.

Dentro de `src/lib/`, três módulos são **exclusivamente de servidor**:
`auth.ts` e `sessao.ts` (usam `node:crypto`) e `supabase/admin.ts` (usa a
`service_role`). Nunca importe os três de um componente `"use client"`.

Cuidado ao varrer o repo: o `grep '"use client"'` acusa `src/lib/supabase/admin.ts`
por causa do aviso no docstring ("nunca importe daqui em componente `"use
client"`"), não porque ele seja um.

## Os dois clients Supabase

| Client | Chave | Papel |
|---|---|---|
| `clientePublico()` em `src/lib/supabase/publico.ts` | anon | toda leitura pública, passando pela RLS de propósito |
| `clienteAdmin()` em `src/lib/supabase/admin.ts` | service_role | escrita, login, votos e tudo que a RLS esconde do anon — sempre no servidor e depois de checar a identidade |

O cliente anon é usado de propósito mesmo onde a `service_role` resolveria: se
uma policy estiver errada, o erro aparece na vitrine em vez de ficar escondido
atrás da `service_role`. Vale para `desafioAtivo`, que consulta a RLS de
`desafios` em vez de contorná-la. Os dois são criados sem sessão e sem
persistência (`persistSession: false`, `autoRefreshToken: false`) — isto não é
login.

`src/lib/dados.ts` é a **única ponte** entre a tela e o Supabase. Saem pelo
cliente público: `listarSalas`, `listarAlunos`, `listarRetrato`, `alunoPorSlug`,
`alunoPorId`, `listarDesafios`, `desafioAtivo`. Saem pelo admin:
`atualizarPerfilAluno`, `apoiarHabilidade`, `submeterDesafio` e
`votosDoVisitante` — este último porque `public.votos` não tem policy nenhuma, e
a leitura é sempre filtrada pelo id que veio do cookie assinado, nunca por algo
que o cliente mandou.

`listarSalas` e `listarRetrato` têm cache em memória de 15 s (`TTL_CACHE_MS`),
limpo por `limparCacheDados()` em toda escrita. É cache de processo: em
serverless, cada instância tem o seu.

## Fluxo de dados

Da página de servidor para o componente de cliente, sempre como props simples:

```
src/app/alunos/page.tsx  (server)
  ├─ cookies() → abrirAssinado(cookie do visitante)      → meusVotos
  └─ Promise.all(listarAlunos, listarSalas, listarRetrato)
        ↓ props
  src/components/Vitrine.tsx  ("use client")
        ├─ naTela  = lista + nome da sala + corDaSala(nome)
        ├─ visiveis = filtrarAlunos(...) → ordenarAlunos(...)   (useMemo)
        ├─ salasRanqueadas = rankingSalas(retrato)              (useMemo)
        └─ estrelar() → fetch /api/estrela → estado otimista com rollback
```

O voto é otimista: `Vitrine` acende a estrela e soma 1 antes da resposta e
desfaz exatamente esse passo se o `fetch` falhar. A resposta do servidor
sobrescreve a contagem com o número real lido do banco.

O CRM segue o mesmo desenho, com um degrau a mais: `/` checa a sessão, lê tudo
que a tela vai precisar e entrega ao `CrmApp`, que é quem mantém o estado das
abas (`portfolio`, `projetos`, `desafios`, `tabelas`, `perfil`, `adm`). Abrir em
uma aba direto é `/?aba=desafios` ou `/?aba=cracha`, lidos do `location.search`.

O endosso de competência tem o mesmo desenho do voto, e a mesma razão: a linha
em `public.endossos` é a verdade e `alunos.habilidades_votos` é cache mantido por
trigger. O `upsert` com `ignoreDuplicates` garante 1 endosso por navegador por
habilidade; como a segunda tentativa não insere linha, o trigger não dispara e o
contador não anda duas vezes.

`src/app/alunos/page.tsx` trata falha de leitura como falha, não como lista
vazia: o `catch` mostra "Não conseguimos carregar a turma agora" em vez de
"Ninguém aqui", para ninguém recadastrar a turma por causa de um banco fora do
ar.

## A função roda em `gru1`, junto do banco

`vercel.json` fixa `"regions": ["gru1"]`. **Não é config órfã — não apague.**

O Supabase está em `sa-east-1` e o default da Vercel para projeto novo é `iad1`
(Washington): sem esse arquivo, cada query atravessa o Atlântico, ~110 ms por
ida e volta, num app que faz várias por página.

O sintoma é medível pelo header, sem instrumentar nada: `x-vercel-id` responde
`gru1::iad1` quando a função está longe do banco, e `gru1::gru1` quando está
perto. Esse header foi o diagnóstico inteiro.

O `gru1` também é a região mais perto de quem usa (a escola é em
Joinville/SC), então ganha nos dois lados — por isso até `/`, que não faz query
nenhuma, ficou mais rápida. O plano Hobby permite uma região; o limite é a
quantidade, não qual.

## O `proxy.ts`

`src/proxy.ts` é o antigo `middleware.ts` — no Next 16 o arquivo mudou de nome e
roda no runtime Node por padrão, que é o que permite usar `node:crypto`. Ele tem
duas responsabilidades numa passada só:

1. Dar a cada navegador um id anônimo assinado (`sesi.visitante`), que é o que
   sustenta o "1 estrela por pessoa". Se o cookie já existe e a assinatura
   confere, ele não toca em nada.
2. Montar a CSP com um nonce novo por requisição e publicá-la nos headers da
   resposta **e** da request. O nonce vai no header de request de propósito: é
   de lá que o Next o lê para carimbar os próprios scripts inline de hidratação.

Este é o único lugar do projeto que gera nonce, então é o único lugar onde a
política pode existir — a CSP que ficava no `next.config.ts` saiu no mesmo
commit, porque dois headers `Content-Security-Policy` na mesma resposta não se
somam (o navegador aplica a interseção). Os headers estáticos que sobraram no
`next.config.ts` são os outros: `nosniff`, `Referrer-Policy`, `X-Frame-Options`,
HSTS e `Permissions-Policy`.

O `matcher` exclui `_next/static`, `_next/image`, `favicon.ico` e os arquivos de
imagem/texto, e corta os prefetch do `next/link` (`next-router-prefetch` e
`purpose: prefetch`) — são requisições do próprio roteador, e gerar nonce para
elas só gasta requisição.

Ele **não** protege o painel: Server Actions são POSTs para a rota onde são
usadas, então um matcher que exclui um caminho também pularia a checagem dele.
A guarda do ADM mora em cada Server Action, em `exigirAdm()`, e na própria
`/adm`, que chama `notFound()` sem o crachá.

## O layout raiz

`src/app/layout.tsx` monta as fontes do Google via `next/font/google` (Manrope e
Bricolage Grotesque, expostas como `--fonte-manrope` e `--fonte-bricolage`), lê o
nonce de `headers()` e injeta um script inline que faz duas coisas antes da
primeira pintura: aplica o tema salvo em `localStorage` (para a página não
piscar) e registra o service worker `/sw.js` no `load`. Ler `headers()` torna o
layout dinâmico — não é regressão, porque todas as páginas reais já chamam
`cookies()`.

O `<Analytics />` da Vercel entra no fim do `<body>`: o script é servido de
`/_vercel/insights` (mesma origem), então passa no `script-src 'self'` sem
precisar de nonce. Fora da Vercel ele não é injetado.

## PWA

`src/app/manifest.ts` é o manifest que vale — existia também um
`public/manifest.json` apontado por `metadata.manifest`, mas a convenção de
arquivo do Next roda depois e sobrescreve aquele campo, então o arquivo morto
saiu. `public/sw.js` (cache `sesi-joinville-v3`) pré-cacheia a raiz, o manifest
e os logos, mais a vitrine `/alunos` num `add` próprio (o `addAll` é tudo-ou-nada
e a vitrine lê o banco a cada render). Offline, quem responde por `/alunos`,
`/u/` e `/validar/` é a vitrine; qualquer outra rota cai no aviso offline — a
raiz `/` seria a tela de login do CRM, inútil sem rede. O sheet de ícones tem um `atalho:`
declarado no próprio manifest: os PNGs são wordmarks (165x64 e 264x64) rotulados
como 192 e 512, e trocá-los por ícones quadrados é peça de design.

## Por que não tem Tailwind

O design system vive em CSS puro, com os tokens como única fonte de verdade.
`src/app/globals.css` hoje é só um ponto de entrada: os 22 linhas dele são 12
`@import` para `src/app/styles/`, um arquivo por domínio — `tokens`, `base`,
`vitrine`, `cracha`, `vitrine-moderno`, `crm`, `adm`, `print`, `cracha-digital`,
`estudio`, `desafios`, `curriculo`, totalizando ~7.500 linhas.

**A ordem dos `@import` é a cascata.** Cada arquivo é uma fatia contígua do
antigo `globals.css`, então reordenar, mover uma regra de arquivo ou "limpar" um
arquivo muda o pixel. Para conferir que a divisão é fiel ao original, concatene
na ordem em que estão no `globals.css`.

As decisões que sustentam a escolha:

- Cores e espaçamentos são custom properties (`--ciano`, `--verde`, `--amarelo`,
  `--vermelho`, `--azul`, `--creme`, `--raio`, `--ease`) em `tokens.css`.
- O tema claro/escuro é uma troca de valores de token sob
  `:root[data-theme="light"]` / `[data-theme="dark"]` — uma regra, sem variante
  por componente. Quem aplica em React é `src/lib/tema.ts`; o script inline do
  layout é o outro lado, e não pode importar dali (é string).
- A cor de cada sala é calculada em runtime por `corDaSala()` (`src/lib/cores.ts`,
  hash do nome sobre as quatro cores do símbolo) e injetada por elemento como
  `--sala`, com fallback `var(--sala, var(--accent))`. Utilitário de classe não
  expressa valor calculado por dado.
- As classes são semânticas do domínio (`.aluno`, `.trilho`, `.ficha`,
  `.retrato`, `.linha-adm`), então o markup lê como o problema.

O custo seria uma toolchain a mais (PostCSS, config, safelist para classes
dinâmicas) num app de oito dependências. Não há `tailwind.config.*` nem
`postcss.config.*` no repositório.

## Invariante dos módulos folha

`src/lib/busca.ts`, `cores.ts`, `csp.ts`, `habilidades.ts`, `importar.ts`,
`links.ts`, `ranking.ts` e `slug.ts` **não têm nenhum import**. Isso é exigência
do runner de teste: `node --experimental-strip-types` não resolve import sem
extensão, e os testes importam esses arquivos direto
(`import { fold } from "../src/lib/busca.ts"`). Se um deles precisar de outro, o
caminho é duplicar a regra pequena ou mover a dependência para quem chama — não
criar o import.

Quase-folhas, que também são testados direto porque só importam de fora do
projeto ou só tipos: `sessao.ts` (só `node:crypto`), `senha.ts` (só
`node:crypto` e `@node-rs/argon2`) e `seguranca.ts`.

`seguranca.ts` é a exceção que confirma a regra, e ela é estreita: o único
import de runtime que ele tem é `./limites.ts`, e **com a extensão escrita**, com
`allowImportingTsExtensions` ligado no `tsconfig.json`. É o único arquivo de
`src/` que escreve a extensão — o resto fica sem, porque só o bundler lê, e o
bundler resolve dos dois jeitos. Mantenha o `.ts` ali: sem ele o
`tests/seguranca.test.mjs` deixa de carregar, e o `npm run typecheck` **não**
avisa, porque `tsc` com `moduleResolution: "bundler"` aceita os dois.

`limites.ts` é folha e existe justamente por isso: o formulário do Estúdio
(componente de cliente) precisa dos mesmos tetos, e não pode importar
`seguranca.ts`, que puxa `node:crypto`.

Os módulos que dependem de ambiente (`dados.ts`, `auth.ts`, `rate-limit.ts`,
`exportar-cracha.ts`, `supabase/*`) ficam fora desse conjunto e não são testados
direto — `auth.ts` e `dados.ts` puxam `next/headers` e o Supabase, que não
existem no `node --test` pelado. `cores.ts` é folha, mas hoje não tem teste
próprio.