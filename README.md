# Alunos SESI

O ecossistema escolar digital de uma turma do SESI de Joinville, num app Next.js
só: cada aluno com nome, sala, LinkedIn, GitHub, projetos e bio num lugar só —
pra turma se conhecer e se ajudar na vida profissional.

Mesmo app, quatro acessos:

| Acesso | Rota | O que é |
|---|---|---|
| Vitrine | `/alunos` | pública. Busca sem acento, filtro por sala e por habilidade, perfil individual, estrela por aluno e ranking das salas |
| CRM escolar | `/` | com login (usuário e senha). Portfólio da turma, projetos, mural de desafios, tabelas e a edição do próprio perfil, com upload de mídia |
| Painel do ADM | `/adm` | protegida. Cadastro, importação em massa, fixar no topo, marcar destaque e remover |
| Identidade | `/u/<slug>`, `/validar/<slug>`, `/alunos/<slug>` | o cartão NFC / link na bio, a validação pública de matrícula e o crachá digital com portfólio e mini-currículo A4 |

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

Abre em http://localhost:3000.

## Variáveis de ambiente

Todas documentadas em `.env.example` (só os nomes; os valores nunca vão pro
git). Resumo do que cada uma faz:

| Variável | Onde vive | Pra que serve |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente + servidor | endpoint do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + servidor | leitura pública, passa pela RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | escrita e votos; nunca chega ao browser |
| `SUPABASE_DB_URL` | só script | conexão direta, usada pelo `scripts/db-query.sh` |
| `ADM_CHAVE` | só servidor | a chave do link secreto `/adm/<chave>` |
| `SESSAO_SEGREDO` | só servidor | segredo mestre que assina os cookies de sessão (visitante, ADM e usuário) e do qual cada um deriva uma subchave por HKDF |
| `BLOB_READ_WRITE_TOKEN` | só servidor | assina o upload direto de mídia (`/api/upload`); o OIDC da Vercel não substitui |
| `VERCEL_TOKEN` | só CLI | deploy; o app não lê |

## O link secreto do ADM

O acesso do ADM é um link que só existe na URL uma vez:

```
/adm/<ADM_CHAVE>
```

Essa rota é um Route Handler, não uma página: ela confere a chave com
`timingSafeEqual`, grava um cookie `httpOnly` e redireciona (303) pra `/adm`.
A partir daí a chave sai da barra de endereço, do histórico e do `Referer`.

- O cookie guarda o **HMAC** da chave, não a chave. Trocar `ADM_CHAVE`
  invalida todos os crachás emitidos.
- Chave errada devolve **404**, não 401 — não confirma que a rota existe.
- Toda Server Action revalida o cookie antes de escrever.

O CRM (`/`) tem porta própria: login nominal por usuário e senha (argon2id, com
hash e rate limit no banco), em três papéis — `super_adm`, `adm` e `aluno`.

## Modelo de acesso

| Quem | Lê | Escreve |
|---|---|---|
| Visitante (anon key) | `salas`, `alunos` e `endossos` | nada |
| Visitante (estrela) | — | via `/api/estrela`, com `service_role` |
| Aluno (login do CRM) | tudo da vitrine | o próprio perfil e a própria mídia, via Server Actions e `/api/upload` |
| ADM | tudo | via Server Actions, com `service_role` |

A tabela `votos` **não tem policy nenhuma**: nem leitura, nem escrita para
`anon`. O voto é gravado pelo Route Handler com a `service_role`, e a
identidade de quem votou vem de um cookie assinado (`sesi.visitante`) — nunca
do corpo da requisição. Um navegador, uma estrela por aluno. Os endossos de
competência seguem a mesma regra, com o contador mantido por trigger.

## Mídia

A galeria do perfil e a capa de projeto sobem direto do navegador para o
Vercel Blob: o formulário carrega só a URL, e `/api/upload` confere a sessão, o
caminho e o ritmo antes de assinar o token — os bytes nunca passam pelo nosso
servidor. O vídeo do perfil não é arquivo hospedado: guarda `{ id, tipo }` de
um YouTube ou Vimeo, e o iframe é montado por allowlist de dois hosts. Detalhes
em `.context/docs/midia.md`.

## Testes e verificação

```bash
npm run typecheck   # next typegen && tsc --noEmit
npm test            # node:test, sem rede
npm run build
```

Os testes cobrem as funções puras de `src/lib/`: normalização de LinkedIn e
GitHub, parser da lista colada, ranking com desempate, `fold` da busca, geração
de slug, o sanitizador de perfil, os tetos de campo, a conversão de mídia e o
`caminhoPertenceAoAluno` do upload, o parser de vídeo e a política de CSP.

## Banco

O schema vive em `src/sql/`, em 13 migrations (001 a 013) — começando por
`001_schema.sql` (tabelas, RLS, triggers e a view `retrato_salas`) e seguindo
por `003_crm_auth.sql` (usuários), `006_endossos.sql` (competências) e as
demais. Aplicar:

```bash
./scripts/db-query.sh --dry-run -f src/sql/001_schema.sql   # ensaia
./scripts/db-query.sh --psql    -f src/sql/001_schema.sql   # aplica
```

O `--dry-run` roda dentro de um `BEGIN`/`ROLLBACK`, então não deixa rastro.

## Importar a turma

No painel, cole a lista direto do Excel/Sheets (TSV) ou de um CSV. A primeira
linha pode ser cabeçalho — se for, as colunas são reconhecidas pelo nome e
podem vir em qualquer ordem. Sem cabeçalho, a ordem é:

```
nome    sala    linkedin    github
```

A prévia mostra o que vai acontecer antes de aplicar. A importação **nunca
sobrescreve** um link já cadastrado: só preenche o que está faltando. Linhas
com problema viram avisos com o número da linha, e o resto entra.

## Deploy

Na Vercel, por CLI:

```bash
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production   # ...e as demais
vercel deploy --prod --yes --token "$VERCEL_TOKEN"
```

As variáveis de ambiente precisam existir na Vercel antes do primeiro deploy
de produção — sem elas o build passa, mas as páginas quebram em runtime.
