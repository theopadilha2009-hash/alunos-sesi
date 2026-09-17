---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Alunos SESI

## O que é

A vitrine da turma de uma escola SESI: cada aluno com nome, sala, LinkedIn e
GitHub, num lugar só. É um app Next.js único, sem backend separado, com
Postgres + RLS no Supabase.

## Para quem

- **A turma** — quem consulta a vitrine para achar colega por sala, por nome
  ou pelo handle do GitHub, e quem compartilha o próprio perfil no currículo.
- **O ADM** (professor ou aluno responsável) — quem cadastra, importa a lista
  da turma, fixa no topo, marca destaque e remove.
- **Quem contrata / a escola** — quem chega no perfil individual de um aluno
  (`/alunos/<slug>`) e precisa do LinkedIn e do GitHub dele em um clique.

## O problema que resolve

Os links da turma vivem espalhados em planilha, grupo de WhatsApp e bio de
rede social. Ninguém acha ninguém, e quem quer ser encontrado não tem onde
apontar. O app centraliza isso numa lista só, com busca sem acento, filtro por
sala e um perfil por aluno cujo endereço é legível (`/alunos/ana-silva`) e
pode ir no currículo.

## As duas portas

Mesmo app, dois acessos:

| Porta | Rota | O que faz |
|---|---|---|
| Vitrine | `/alunos` | pública: busca, filtro por sala, perfil individual, estrela por aluno e ranking das salas |
| Painel do ADM | `/adm` | restrita: cadastro, importação em massa, fixar, destaque e remover |

O painel não é linkado em lugar nenhum e não é indexado. A entrada é um link
secreto, `/adm/<ADM_CHAVE>`, que troca a chave por um cookie `httpOnly` e sai
da barra de endereço no primeiro redirect. Detalhes do modelo de acesso em
`security.md`.

## Estado atual

Pronto e em uso:

- Vitrine com busca sem acento (`fold` em `src/lib/busca.ts`), filtro por sala,
  atalho "meus estrelados", retrato com os números da turma e ranking das salas
  (`src/components/Vitrine.tsx`).
- Perfil individual em `src/app/alunos/[slug]/page.tsx`, com selos de fixado e
  destaque, bio, links e contagem de estrelas.
- Estrela por aluno: 1 por navegador, via `src/app/api/estrela/route.ts`, com
  atualização otimista na tela e rollback se o servidor recusar.
- Painel do ADM (`src/app/adm/page.tsx`): importação em massa com prévia feita
  no navegador, cadastro de um aluno por vez, fixar, destacar e remover.
- Schema aplicável em `src/sql/001_schema.sql` — tabelas `salas`, `alunos`,
  `votos`, RLS, trigger do contador de estrelas e a view `retrato_salas`.
- CI em `.github/workflows/ci.yml` (typecheck + testes + build) e deploy na
  Vercel por CLI.

Ficou para depois (o que o repositório mostra hoje):

- **O "segundo app" não existe no repositório.** Não há rota, componente,
  tabela, migration ou nota descrevendo um segundo produto — o escopo do repo
  são as duas portas acima. Qualquer decisão sobre ele ainda está em aberto.
- `alunos.foto_url` existe na tabela (`src/sql/001_schema.sql`), no tipo `Aluno`
  (`src/lib/tipos.ts`) e no select de `src/lib/dados.ts`, mas nenhuma tela
  escreve nem lê esse campo: os avatares são iniciais geradas por `iniciais()`
  em `src/lib/links.ts`. Não há upload nem Storage configurado.
- `bio` só é preenchida pelo formulário de um aluno por vez (`criarAluno` em
  `src/app/adm/acoes.ts`). `parseLista` não reconhece coluna de bio, então a
  importação em massa nunca preenche bio.
- Não há login nominal do ADM: o acesso é um segredo compartilhado, sem autoria
  por pessoa e sem trilha de quem alterou o quê.
- Server Actions e Route Handlers não têm teste automatizado (ver
  `testing-strategy.md`).

## Onde começar a ler

1. `README.md` — como rodar, variáveis de ambiente, modelo de acesso.
2. `src/sql/001_schema.sql` — o domínio (salas, alunos, votos) e a RLS.
3. `src/lib/dados.ts` — a única ponte entre tela e Supabase.
4. `src/app/alunos/page.tsx` → `src/components/Vitrine.tsx` — o fluxo de dados
   completo, do servidor até o clique na estrela.
5. `src/app/adm/acoes.ts` — toda a escrita do painel, cada ação começando por
   `exigirAdm()`.
