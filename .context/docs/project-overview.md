---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-09-25
status: filled
scaffoldVersion: "2.0.0"
---

# Alunos SESI

## O que é

O ecossistema escolar digital da turma de uma escola SESI de Joinville, em três
produtos no mesmo repositório Next.js:

1. **A vitrine** — cada aluno com nome, sala, LinkedIn, GitHub, Instagram,
   projetos e bio, num lugar só, com busca sem acento, filtro por sala e ranking
   das salas.
2. **O CRM escolar** — login por usuário e senha, e um workspace com abas:
   portfólio da turma, projetos e criações, mural de desafios, tabelas e o
   perfil editável do próprio aluno.
3. **As páginas de identidade** — um cartão NFC / link na bio por aluno
   (`/u/<slug>`), a validação pública de matrícula (`/validar/<slug>`), o crachá
   digital com portfólio (`/alunos/<slug>`) e o mini-currículo A4 para impressão.

É um app Next.js único, sem backend separado, com Postgres + RLS no Supabase.

## Para quem

- **A turma** — quem consulta a vitrine para achar colega por sala, por nome,
  por habilidade ou pelo handle do GitHub; quem edita o próprio perfil no CRM e
  quem usa o cartão NFC para se apresentar.
- **O aluno e quem contrata a escola** — quem chega no perfil individual
  (`/alunos/<slug>`) e precisa do LinkedIn, do GitHub e do currículo dele em um
  clique.
- **O ADM e o super ADM** — quem cadastra, importa a lista da turma, fixa no
  topo, marca destaque e remove.
- **Quem recebe um documento** — quem confere a matrícula de um aluno em
  `/validar/<slug>` antes de aceitar o crachá.

## O problema que resolve

Os links da turma vivem espalhados em planilha, grupo de WhatsApp e bio de rede
social. Ninguém acha ninguém, e quem quer ser encontrado não tem onde apontar. O
app centraliza isso numa vitrine só, dá a cada aluno um endereço legível
(`/alunos/ana-silva`) para pôr no currículo, um cartão digital para apresentar
por aproximação, e um lugar onde o professor mantém a turma atualizada sem
planilha.

## As três portas

Mesmo app, três acessos:

| Porta | Rota | O que faz |
|---|---|---|
| Vitrine | `/alunos` | pública: busca, filtro por sala e por habilidade, perfil individual, estrela por aluno e ranking das salas |
| CRM escolar | `/` | com login: portfólio da turma, projetos, mural de desafios, tabelas, edição do próprio perfil e as ferramentas de ADM |
| Painel do ADM | `/adm` | restrita: importação em massa, cadastro, fixar, destaque, mudar de sala e remover |
| Identidade | `/u/<slug>`, `/validar/<slug>`, `/alunos/<slug>` | cartão NFC / link na bio, validação de matrícula e crachá com portfólio |

O painel cru não é linkado em lugar nenhum e não é indexado. A entrada é um link
secreto, `/adm/<ADM_CHAVE>`, que troca a chave por um cookie `httpOnly` e sai da
barra de endereço no primeiro redirect. O CRM tem login próprio (usuário e
senha, argon2id) e três papéis: `super_adm`, `adm` e `aluno`. Detalhes do modelo
de acesso em `security.md`.

## Estado atual

Pronto e em uso:

- Vitrine com busca sem acento (`fold` em `src/lib/busca.ts`), filtro por sala e
  por competência, atalho "meus estrelados", tabela, retrato com os números da
  turma e ranking das salas (`src/components/Vitrine.tsx`).
- Perfil individual em `src/app/alunos/[slug]/page.tsx` (`PerfilInterativo`):
  selos de fixado e destaque, bio, links, QR code do próprio URL, crachá em PNG,
  o mini-currículo A4, a galeria de mídias do aluno, as competências que ele
  declarou e as insígnias derivadas de estrelas e endossos.
- Cartão NFC / link na bio em `src/app/u/[slug]/page.tsx`, com stickers
  posicionados por porcentagem e contagem de apoios por competência.
- Validação pública de matrícula em `src/app/validar/[slug]/page.tsx`.
- Estrela por aluno: 1 por navegador, via `src/app/api/estrela/route.ts`, com
  atualização otimista na tela e rollback se o servidor recusar.
- Endosso de competência ("+1" estilo LinkedIn) em `public.endossos`, também 1
  por navegador por habilidade, com o contador mantido por trigger.
- Seis insígnias derivadas de conquista real (`src/lib/insignias.ts`): o aluno
  vê a que falta com a barra de progresso, e nenhuma delas se escolhe — todas
  saem de estrelas recebidas e endossos de colegas.
- CRM escolar (`/`) com login, cadastro, edição de perfil, upload de mídias,
  Estúdio Canva de stickers/GIFs, mural de desafios e submissão de projetos.
- Painel do ADM (`/adm`): importação em massa com prévia feita no navegador,
  cadastro de um aluno por vez, fixar, destacar, mudar de sala e remover.
- PWA instalável: `src/app/manifest.ts` e `public/sw.js` (cache
  `sesi-joinville-v3`), com atalhos `/?aba=desafios` e `/?aba=cracha`.
- Schema versionado em `src/sql/`, em 9 migrations (001 a 009).
- CI em `.github/workflows/ci.yml` (typecheck + testes + build) e deploy na
  Vercel, ligada ao GitHub.

Ficou para depois (o que o repositório mostra hoje):

- **O "segundo app" continua sem resposta.** O que existe são os três produtos
  acima, e nada no repositório descreve um quarto. Qualquer decisão sobre ele
  segue em aberto.
- `alunos.foto_url` deixou de ser coluna morta: o editor do CRM recorta a imagem
  no cliente em `FOTO_LADO` (256×256) e grava o data URL, com teto de 120 KB, e
  `src/components/Avatar.tsx` passou a desenhar a foto nas telas que antes
  escreviam as iniciais na mão. Continua sem Storage — a imagem mora dentro da
  própria linha, o que serve para avatar e não serve para mídia (ver abaixo).
- As mídias e as capas de projeto são data URLs dentro de `alunos.midias` e
  `alunos.projetos` (JSONB): até 12 × 2 MB e 10 × 2 MB por aluno. O teto é por
  item, não por formulário, e o `bodySizeLimit` do Server Action é 4 MB — então
  um perfil que junte várias imagens no teto salva e depois não consegue salvar
  de novo. Mover para Vercel Blob resolve os dois lados (peso do payload e teto
  do POST) e é a onda seguinte, já mapeada antes desta mudança.
- `?curriculo=1` é oferecido pelo `/u/[slug]` como "Mini-Currículo A4"
  (`src/app/u/[slug]/page.tsx`), mas nenhuma página lê `searchParams`: o
  parâmetro chega e morre. O único leitor de `location.search` é o `CrmApp`
  (`src/components/crm/CrmApp.tsx`), para os atalhos do PWA `?aba=desafios` e
  `?aba=cracha`. O mini-currículo só abre pelo botão dentro do perfil.
  **A confirmar** se a intenção era deep-link.
- O número de matrícula e o "hash SHA-256" do `/validar/[slug]` são derivados na
  hora de `slug`, `estrelas` e `id` — não há coluna nem verificação no banco. É
  peça de documento impresso, não de autenticação.
- `bio` só é preenchida pelo formulário de um aluno por vez e pela edição do CRM.
  `parseLista` não reconhece coluna de bio, então a importação em massa nunca
  preenche bio.
- Não há autoria por pessoa no painel do ADM: o acesso é um segredo
  compartilhado, sem trilha de quem alterou o quê. O CRM já tem usuário nominal,
  mas o `/adm` cru não olha para ele além de aceitar `super_adm`.
- `src/sql/002_seed_demo.sql` insere salas e alunos de demonstração. Aplicá-lo
  contra produção escreve turma inventada na vitrine — **a confirmar** se ele
  deve continuar no diretório ou virar só de ambiente local.
- Os ícones do PWA são wordmarks rotulados como 192 e 512 (ver o `atalho:`
  dentro de `src/app/manifest.ts`): o app instala, mas o ícone renderiza
  espremido. Trocar por ícones quadrados é peça de design.
- Server Actions e Route Handlers não têm teste automatizado (ver
  `testing-strategy.md`).

## Onde começar a ler

1. `README.md` — como rodar, variáveis de ambiente, modelo de acesso.
2. `src/sql/001_schema.sql` — o domínio base (salas, alunos, votos), a RLS e a
   view `retrato_salas`; depois `003_crm_auth.sql` (usuários) e `006_endossos.sql`
   (competências).
3. `src/lib/dados.ts` — a única ponte entre tela e Supabase.
4. `src/app/alunos/page.tsx` → `src/components/Vitrine.tsx` — o fluxo de dados
   completo, do servidor até o clique na estrela.
5. `src/app/page.tsx` → `src/components/crm/CrmApp.tsx` — a porta do CRM e as
   seis abas do workspace.
6. `src/app/adm/acoes.ts` — toda a escrita do painel, cada ação começando por
   `exigirAdm()`.