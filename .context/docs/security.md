---
type: doc
name: security
description: Security policies, authentication, secrets management, and compliance requirements
category: security
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Segurança

O app tem dois segredos (a `service_role` do Supabase e `ADM_CHAVE`), dois
cookies assinados e uma tabela sem policy nenhuma. É disso que trata este
documento.

## Modelo de acesso

| Quem | Como se identifica | Lê | Escreve |
|---|---|---|---|
| Visitante (anon key) | nada | `salas`, `alunos`, `retrato_salas` — policy de select `using (true)` | nada |
| Visitante que vota | cookie `sesi.visitante` assinado | — | `votos`, e só através do Route Handler `/api/estrela`, com `service_role` |
| ADM | cookie `sesi.adm` (HMAC da chave) | tudo | `alunos` e `salas`, via Server Actions, com `service_role` |

Ninguém escreve em `alunos`/`salas` com anon ou authenticated: as policies de
select são as únicas que existem em `src/sql/001_schema.sql`, e toda escrita
passa pela `service_role` no servidor.

## O link secreto é um Route Handler

A chave do ADM nunca é uma página. `src/app/adm/[chave]/route.ts` é um Route
Handler `GET`, e isso é deliberado: uma página renderiza e devolve HTML, e a
chave ficaria no `Referer` de qualquer recurso que ela carregasse. O handler:

1. Confere a chave com `chaveValida()` (`src/lib/sessao.ts`), que usa
   `timingSafeEqual` — o tamanho é comparado antes, porque `timingSafeEqual`
   lança com buffers de tamanhos diferentes, e o tamanho da chave não é segredo.
2. Chave errada devolve **404**, não 401. Um 401 confirmaria que a rota existe
   e que só falta a senha.
3. Chave certa responde com redirect **303** para `/adm` e grava o cookie
   `sesi.adm`. O 303 força o método a virar GET, e o redirect tira a chave da
   barra de endereço, do histórico e do `Referer` das navegações seguintes.

A resposta de sucesso e a de 404 levam `X-Robots-Tag: noindex, nofollow`.

## O crachá guarda HMAC, não a chave

`crachaAdm()` devolve `assinar("adm-v1")` — um HMAC-SHA256, não a chave do
ambiente. Consequências, todas intencionais:

- Trocar `ADM_CHAVE` invalida todos os crachás emitidos, sozinho.
- Um crachá vazado não entrega a chave, então não dá para reemitir crachás nem
  assinar o cookie do visitante.
- `crachaValido()` compara o valor aberto com a marca `adm-v1`, em tempo
  constante, através de `abrirAssinado()`.

O mesmo segredo assina o cookie do visitante, então girar `ADM_CHAVE` também
zera a identidade de voto de todo mundo (as linhas antigas de `votos` ficam
órfãs de cookie, e o contador de `alunos.estrelas` não volta atrás).

Atributos dos dois cookies (`opcoesCookie`): `httpOnly`, `sameSite: "lax"`,
`path: "/"`, `secure` apenas em `NODE_ENV === "production"` (em dev o app roda
em http). Validade: 30 dias para o crachá do ADM (`TRINTA_DIAS`), 1 ano para o
visitante (`UM_ANO`).

## O cookie do visitante é assinado

`src/proxy.ts` gera o id com `novoVisitante()` (16 bytes aleatórios em hex) e o
grava como `id.hmac`. O id **nunca** vem do cliente: se a assinatura não
confere em `abrirAssinado()` (que usa `timingSafeEqual` sobre o token inteiro),
o proxy emite um novo. É isso que sustenta o "1 estrela por pessoa" — trocar um
número no DevTools não compra voto extra.

O formato tem que bater com a CHECK do banco:
`visitante_id ~ '^[a-f0-9]{32}$'` em `public.votos`. Se `novoVisitante()`
mudasse de forma, o insert passaria a falhar na constraint.

Se `ADM_CHAVE` não estiver configurada, o proxy não consegue assinar: ele loga
o erro e segue (`NextResponse.next()`), de modo que a vitrine continua de pé e
só o voto fica sem identidade. Quem falha alto nesse cenário é o painel.

## `votos` não tem policy nenhuma

Em `src/sql/001_schema.sql` a tabela `votos` só tem `enable row level security`
— nenhum `create policy`. Consequência: com a anon key, ninguém lê, insere ou
apaga voto. Quem vota é `src/app/api/estrela/route.ts`, no servidor, com a
`service_role`.

O handler valida duas coisas antes de escrever:

- a identidade sai de `abrirAssinado(jar.get(COOKIE_VISITANTE))` — do cookie,
  nunca do corpo da requisição, que é justamente por onde se tentaria forjar 50
  votos;
- o `alunoId` do corpo passa por `RE_UUID`; qualquer coisa fora disso é 400.

O POST usa `upsert(..., { onConflict: "aluno_id,visitante_id", ignoreDuplicates: true })`,
que é o mesmo que `on conflict do nothing`: quem já votou não insere de novo, e
como nenhuma linha entra, o trigger do contador não dispara. O DELETE apaga
sempre pelas duas colunas (`aluno_id` + `visitante_id`), então um visitante não
consegue tirar a estrela de outro.

A leitura de "quais alunos eu estreei" (`votosDoVisitante` em `src/lib/dados.ts`)
também usa a `service_role`, porque não há policy de select — e é sempre
filtrada pelo id vindo do cookie.

## Headers — `next.config.ts`

Aplicados em `/:path*`:

| Header | Valor | Para quê |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | impede o navegador de adivinhar tipo |
| `Referrer-Policy` | `no-referrer` | enquanto a chave está na URL, nenhum subrecurso manda a URL inteira no `Referer` |
| `X-Frame-Options` | `DENY` | não dá para embutir o app num iframe |
| `Content-Security-Policy` | `frame-ancestors 'none'; object-src 'none'; base-uri 'self'` | fecha frame, plugin e `<base>` trocado |

E em `/adm/:path*`:

| Header | Valor |
|---|---|
| `X-Robots-Tag` | `noindex, nofollow` |

O `no-referrer` é a segunda camada, depois do redirect que tira a chave da URL
— o comentário em `next.config.ts` diz exatamente isso. Além dos headers, o
`layout.tsx` publica `robots: { index: false, follow: false }` no metadata, e
`src/app/robots.ts` declara `disallow: /adm`.

## Toda Server Action chama `exigirAdm()`

`src/app/adm/acoes.ts` abre com `"use server"` e a primeira linha de cada ação
exportada — `importarLista`, `criarAluno`, `removerAluno`, `alternar` — é
`await exigirAdm()`. A função lê o cookie `sesi.adm` e chama `crachaValido()`;
se não conferir, lança `Acesso restrito ao ADM`.

Isso é defesa em profundidade, não redundância: o `proxy.ts` **não** cobre
Server Functions (são POSTs para a rota onde são usadas, e o matcher do proxy
exclui caminhos). A checagem de `src/app/adm/page.tsx` protege a renderização
da página, não a execução das ações — quem tem o `action id` de uma Server
Action pode chamá-la sem nunca carregar o painel.

## Segredos

| Variável | Onde pode aparecer |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente e servidor (são públicas por definição) |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor**, em `src/lib/supabase/admin.ts` |
| `SUPABASE_DB_URL` | só no `scripts/db-query.sh` |
| `ADM_CHAVE` | só servidor: assina cookies e confere o link |
| `VERCEL_TOKEN` | só CLI, nunca lido pelo app |

`.env.local` é gitignored (`.gitignore` cobre `.env*` e reabre só
`!.env.example`). O `.env.example` leva apenas os nomes. O CI
(`.github/workflows/ci.yml`) roda o build com valores de mentira — nenhum
segredo real passa por lá.

A `service_role` no browser entregaria o banco inteiro: se ela chegar ao bundle
do cliente, o vazamento é total, não parcial. Por isso `src/lib/supabase/admin.ts`
carrega o aviso no topo e não pode ser importado de componente `"use client"`,
nem devolver resultado cru para o cliente.

## Limites conhecidos

- **Sem identidade nominal do ADM.** É um segredo compartilhado: quem tem o
  link é ADM, e não há registro de quem fez o quê. Não existe log de auditoria
  das ações do painel.
- **Sem rate limit no voto.** A única barreira é o cookie assinado (1 por
  navegador). Limpar cookies ou usar outro navegador permite votar de novo —
  é o trade-off aceito por não haver login para o visitante.
- **`ADM_CHAVE` acumula dois papéis:** chave do link secreto e segredo de
  assinatura dos cookies. Girar o valor tem efeito nos dois.
