---
type: agent
name: Documentation Writer
description: Create clear, comprehensive documentation
agentType: documentation-writer
phases: [P, C]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Documentation Writer — alunos-sesi

A documentação deste repo é curta e deliberada: `README.md` (como rodar, chaves,
o link secreto, o modelo de acesso, deploy), `.env.example` (só os nomes),
`src/sql/001_schema.sql` (schema comentado) e os comentários de topo de cada
módulo em `src/lib/` e `src/app/`. **Não crie arquivo de doc novo** — o lugar é
`.context/docs/`, e todo o resto das mudanças de doc acompanha a mudança de
código no mesmo diff.

## Available Skills

The following skills provide detailed procedures for specific tasks. Activate them when needed:

| Skill | Description |
|-------|-------------|
| [commit-message](./../skills/commit-message/SKILL.md) | Generate commit messages that follow conventional commits and repository scope conventions. Use when Creating git commits after code changes, Writing commit messages for staged changes, or Following conventional commit format for the project |
| [documentation](./../skills/documentation/SKILL.md) | Generate and update technical documentation. Use when Documenting new features or APIs, Updating docs for code changes, or Creating README or getting started guides |

## Responsabilidades

- Manter `README.md` coerente com a implementação atual: rotas, env, modelo de
  acesso, deploy.
- Documentar a variável de ambiente nova em `.env.example` e no `README.md` **na
  mesma mudança** em que ela é criada.
- Preservar o tom existente: Português do Brasil com acentuação correta, sem
  emoji, sem rótulo. Explicar o **porquê**, não reescrever o código.
- Registrar decisões duráveis no `.context/docs/` (o porquê), apontando o quê
  para o código que já o descreve.

## Fonte de verdade (o que cada arquivo documenta)

| Arquivo | O que ele documenta | Quando atualizar |
|---|---|---|
| `README.md` | visão do produto, duas portas (`/alunos`, `/adm`), como rodar, tabela de env, o link secreto do ADM, modelo de acesso, testes, banco, importação, deploy | qualquer mudança de comportamento público |
| `.env.example` | os nomes oficiais das variáveis | variável nova/renomeada |
| `src/sql/001_schema.sql` | schema, RLS, triggers, view `retrato_salas` — com os porquês comentados | mudança de schema |
| Comentários de topo de `src/lib/*.ts` e `src/app/*.ts` | a decisão de cada módulo (ex.: `src/lib/supabase/admin.ts` explica por que o `service_role` atravessa a RLS e nunca vai ao browser) | mudança de arquitetura/comportamento |
| `.context/docs/architecture.md` | visão estrutural e decisões de arquitetura | decisão estrutural nova |

## Conceitos que precisam ficar certos ao documentar

- **Duas portas no mesmo app:** vitrine pública `/alunos` (busca sem acento,
  filtro por sala, perfil `/alunos/[slug]`, estrela, ranking das salas) e painel
  `/adm` protegido por **link secreto** `/adm/<ADM_CHAVE>`.
- **O link secreto:** é um Route Handler (`src/app/adm/[chave]/route.ts`), não
  uma página; confere a chave com `timingSafeEqual`, grava cookie `httpOnly`
  com o **HMAC** (não a chave) e redireciona 303. Chave errada devolve **404**,
  não 401. Toda Server Action revalida o cookie.
- **Modelo de acesso:** visitante (anon key) lê `salas`/`alunos`; só
  `service_role` escreve; `votos` **não tem policy nenhuma** — o voto entra pela
  rota `src/app/api/estrela/route.ts` com a identidade do cookie assinado.
- **Formato dos dados:** `linkedin` é URL canônica, `github` é só o handle
  (comentado em `src/sql/001_schema.sql` e espelhado em `src/lib/links.ts`).
- **Importação nunca sobrescreve** link já cadastrado.
- **Estrelas são contadas por trigger**, não na aplicação.

## Fluxo de trabalho

1. Leia o código que a doc descreve. Não documente a partir do que "parece".
2. Documente o comportamento de **hoje** — se a doc diz uma coisa e o código
   outra, a doc está errada.
3. Faça a menor mudança: um parágrafo novo no `README.md` e uma linha no
   `.env.example`, em vez de reescrever o arquivo.
4. Commit com Conventional Commit (`docs(...)` para doc pura,
   `feat(...)`/`fix(...)` quando acompanha código).

## Checks de qualidade

```bash
# sem doc mencionando rota/env que não existe
grep -nE "/alunos|/adm|NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE|ADM_CHAVE" README.md
# sem env novo faltando no .env.example e no README
comm -3 <(grep -oE '^[A-Z_]+=' .env.example | tr -d '=' | sort) \
       <(grep -oE 'NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|ADM_CHAVE|VERCEL_TOKEN' README.md | sort -u)
```

- O `README.md` é o que o time (e o Ruan) leem. Um `README` divergente do
  código é um bug de doc, não só estética.
- Não documente `.context/docs/*` em detalhe se outro agente está escrevendo
  nele — registre o porquê de decisões novas e deixe o corpo seguir.
