# Alunos SESI

A vitrine da turma: cada aluno com nome, sala, LinkedIn e GitHub, num lugar
só — pra turma se conhecer e se ajudar na vida profissional.

Tem duas portas, no mesmo app:

- **Vitrine** (`/alunos`) — pública. Busca sem acento, filtro por sala,
  perfil individual, estrela por aluno e ranking das salas.
- **Painel do ADM** (`/adm`) — protegida. Cadastro, importação em massa,
  fixar no topo, marcar destaque e remover.

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

## Modelo de acesso

| Quem | Lê | Escreve |
|---|---|---|
| Visitante (anon key) | `salas`, `alunos` | nada |
| Visitante (estrela) | — | via `/api/estrela`, com `service_role` |
| ADM | tudo | via Server Actions, com `service_role` |

A tabela `votos` **não tem policy nenhuma**: nem leitura, nem escrita para
`anon`. O voto é gravado pelo Route Handler com a `service_role`, e a
identidade de quem votou vem de um cookie assinado (`sesi.visitante`) — nunca
do corpo da requisição. Um navegador, uma estrela por aluno.

## Testes e verificação

```bash
npm run typecheck   # tsc --noEmit
npm test            # node:test, sem rede
npm run build
```

Os testes cobrem só as funções puras (`src/lib/`), que por isso não têm
imports cruzados: normalização de LinkedIn/GitHub, parser da lista colada,
ranking com desempate, `fold` da busca e geração de slug.

## Banco

O schema vive em `src/sql/001_schema.sql` — tabelas, RLS, triggers e a view
`retrato_salas`. Aplicar:

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
