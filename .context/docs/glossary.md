---
type: doc
name: glossary
description: Project terminology, type definitions, domain entities, and business rules
category: glossary
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Glossário

Termos do domínio do app, com onde cada um vive no código.

## Aluno

A unidade principal. Linha de `public.alunos` (`src/sql/001_schema.sql`), tipo
`Aluno` em `src/lib/tipos.ts` (com `sala`, `cor` já resolvidos como
`AlunoNaTela`), lido por `listarAlunos`/`alunoPorSlug` em `src/lib/dados.ts` e
renderizado por `CartaoAluno` / `src/app/alunos/[slug]/page.tsx`. Tem nome,
slug, sala, LinkedIn, GitHub, Instagram, e-mail, bio (até 280), `foto_url`
(recortada 256×256 no cliente, data URL de até 120 KB), `banner_url` (capa,
220 KB), `cor_perfil`, `habilidades`, `midias`, `videos`, `stickers`, `fixado`,
`destaque` e a contagem `estrelas`.

## Aluno aprovado

O perfil só aparece na vitrine e no crachá depois de aprovado (`alunos.aprovado`).
Enquanto pende moderação, `/alunos/[slug]` devolve **404** — não "em análise":
para quem está de fora um pendente não existe, e dizer que existe transformaria
a moderação em vitrine. O `generateMetadata` também não vaza nem o nome no
`<title>`. Ver `security.md`.

## Sala

A turma — `public.salas`; tipo `Sala` em `src/lib/tipos.ts`; `listarSalas` em
`src/lib/dados.ts`. Nome como `"3ºA"`, com curso e turno opcionais e uma
`ordem` para exibição. A cor de cada sala vem de `corDaSala()` em
`src/lib/cores.ts` (hash do nome sobre as quatro cores do símbolo) e é injetada
como a variável `--sala`. Sempre pesquisável na forma `3ºA`/`3oA`/`3A` via
`fold`.

## Vitrine

A porta pública, `/alunos`. Componente `src/components/Vitrine.tsx` (client),
alimentado por `src/app/alunos/page.tsx` (server). Tem busca, filtro por sala e
por habilidade, o atalho "Meus estrelados", o retrato com os números da turma,
a grade de cartões e o ranking das salas.

## CRM escolar

A porta com login, `/`. Componente `src/components/crm/CrmApp.tsx` (client) e
as seis abas do workspace: Portfólio, Projetos & Criações, Mural de Desafios,
Tabelas & Alunos, Meu Perfil (com upload de mídia) e Painel ADM.
Toda a escrita sai de Server Actions em `src/app/acoes-crm.ts`. O login é nominal
(usuário e senha, argon2id) e a sessão é o cookie `sesi.usuario`. Ver `Usuario`.

## Painel

A porta restrita, `/adm`. `src/app/adm/page.tsx` (server) e os componentes
`src/components/adm/*`. Toda mudança sai de uma Server Action em
`src/app/adm/acoes.ts`. No CRM ele aparece integrado como `PainelAdmIntegrado`.

## ADM

Quem tem a chave do link secreto (`ADM_CHAVE`). Não é usuário com login:
identidade é o cookie `sesi.adm` (HMAC da chave). Ver `security.md`. É o acesso
cru, sem autoria por pessoa — o CRM tem usuário nominal, mas o `/adm` não olha
para ele além de aceitar `super_adm`.

## Usuário

A conta nominal do CRM: `public.usuarios` (`src/sql/003_crm_auth.sql`), com
senha em hash argon2id, tipo `Usuario` em `src/lib/tipos.ts`, login e sessão em
`src/lib/auth.ts` e `src/lib/senha.ts`. Três papéis: `super_adm`, `adm` e
`aluno`. O aluno só enxerga e edita o próprio perfil; o `adm` modera.

## Endosso

O "+1" de competência, no estilo LinkedIn: uma linha de `public.endossos` por
`(aluno, habilidade, visitante)`, com o contador mantido por trigger. Como a
estrela, é um por navegador por habilidade, e a identidade vem do cookie
assinado — nunca do corpo da requisição. Migration `src/sql/006_endossos.sql`.

## Habilidade / competência

O que o aluno declara saber, na coluna `alunos.habilidades` (JSONB). Desde a
`009` o aluno escreve o que quiser (até o teto de `extrairHabilidades`) — o
texto livre entra na coluna como está. `habilidadePermitida`
(`src/lib/habilidades.ts`) existe para outra coisa: é a allowlist das dez
competências **endossáveis**, e é o que `apoiarHabilidadeAction` consulta antes
de gravar um `+1`. Ou seja, competência fora da lista aparece no perfil e não
recebe apoio. Quem desenha o botão de `+1` precisa passar por ela, senão
oferece um clique que o servidor sempre recusa. É
diferente das habilidades *derivadas* da bio: enquanto `habilidades` for `NULL`
("nunca editou o perfil"), `resolverAluno` cai em `extrairHabilidades(bio)`;
`[]` significa "escolheu não ter nenhuma" e **não** cai no fallback. Migration
`src/sql/009_habilidades_do_aluno.sql`.

## Insígnia

Conquista derivada de dado real, nunca escolhida pelo aluno:
`src/lib/insignias.ts` define uma escada fixa de seis, que acende por estrelas
recebidas e endossos de colegas. O aluno vê a que falta com a barra de
progresso, e `progresso` nunca passa do alvo.

## Estrela / voto

Uma estrela por navegador por aluno. O voto é a linha de `public.votos`, com
chave primária `(aluno_id, visitante_id)`; a contagem exibida é a coluna
derivada `alunos.estrelas`, mantida pelo trigger `sync_estrelas()`
(`src/sql/001_schema.sql`). Quem grava é o Route Handler
`src/app/api/estrela/route.ts` (POST para dar, DELETE para tirar), com
`service_role` e identidade do cookie assinado. O `ESTRELADOS` (`"★"` em
`src/lib/busca.ts`) é o filtro "quem eu estreei". O voto na tela é otimista
em `Vitrine.estrelar()`.

## Fixar

Colocar um aluno no topo da vitrine, independente de estrelas. Campo
`alunos.fixado` (default `false`), alternado por `alternar(formData)` em
`src/app/adm/acoes.ts`, e que manda primeiro na ordem de `ordenarAlunos()`
(`src/lib/ranking.ts`). Índice parcial `alunos_fixado_idx where fixado` no banco.

## Destaque

O carimbo do ADM, equivalente a uma "estrela do ADM". Campo `alunos.destaque`,
também alternado por `alternar()`; vem depois de `fixado` e antes das estrelas
na ordenação. Aparece como selo `★ Destaque do ADM`.

## Retrato

Os números da turma de uma sala, agregados **no banco**: quantos alunos, quantos
com LinkedIn, quantos com GitHub, total de estrelas e completude. É a view
`retrato_salas` (com `security_invoker = true`, então respeita a RLS de quem
consulta), tipo `RetratoSala` em `src/lib/tipos.ts`, lida por
`listarRetrato()` em `src/lib/dados.ts`, e a seção "Retrato" no topo da vitrine
(`src/components/Vitrine.tsx`).

## Completude

Percentual de preenchimento dos links de uma sala, calculado na view
`retrato_salas`: `100 * (com_linkedin + com_github) / (2 * alunos)`. Usado como
desempate no ranking de salas (`rankingSalas()` em `src/lib/ranking.ts`) e
exibido no item do ranking.

## Visitante

Um navegador sem login. Tem uma identidade anônima assinada, o cookie
`sesi.visitante` (16 bytes hex), gerada por `novoVisitante()` e validada por
`abrirAssinado()` em `src/lib/sessao.ts`. É o que define "o que ESTE navegador
já estrelou": `votosDoVisitante()` em `src/lib/dados.ts` e `visitanteAtual()`
em `src/app/api/estrela/route.ts`. A mesma identidade responde pelos endossos.

## Sessão

O cookie assinado por `SESSAO_SEGREDO`, em três propósitos que **não se abrem
entre si**: `sesi.visitante`, `sesi.usuario` e `sesi.adm`. Cada um recebe uma
subchave HKDF diferente (`assinar`/`abrirAssinado` em `src/lib/sessao.ts`),
então um token de um domínio não vale no outro. Trocar `SESSAO_SEGREDO` derruba
todas as sessões ativas de uma vez.

## Crachá

O cookie `sesi.adm` que dá acesso ao painel. Emite em
`src/app/adm/[chave]/route.ts` via `crachaAdm()` e valida com `crachaValido()`
(`src/lib/sessao.ts`). Guarda o **HMAC** da chave (`assinar("adm-v1")`), não a
chave — trocar `ADM_CHAVE` invalida todos os crachás. Válido por 30 dias
(`TRINTA_DIAS`).

## Crachá digital

Não confundir com o crachá acima (que é o cookie do painel). É a **página** do
aluno, `/alunos/<slug>`, renderizada por `PerfilInterativo`: selos de fixado e
destaque, bio, links, QR code do próprio URL, botão para baixar o crachá em
PNG, o mini-currículo A4, a galeria, as competências e as insígnias. É a rota
que o cartão NFC abre por padrão.

## Cartão

O cartão de identidade do aluno, `/u/<slug>` (`src/app/u/[slug]/page.tsx`): o
destino do NFC e do link na bio, com stickers posicionados por porcentagem e a
contagem de apoios por competência. Traz o botão "Mini-Currículo (A4)", que
aponta para `/alunos/<slug>?curriculo=1` — o parâmetro é o que abre o currículo
já na chegada (`abrirCurriculo` em `PerfilInterativo`).

## Validação de matrícula

A conferência pública em `/validar/<slug>` (`src/app/validar/[slug]/page.tsx`),
para quem recebe o documento antes de aceitar o crachá. O número de matrícula e
o "hash SHA-256" exibidos são derivados na hora de `slug`, `estrelas` e `id` —
**não há coluna nem verificação no banco**. É peça de documento impresso, não
de autenticação.

## Mini-currículo (A4)

A folha de currículo para impressão do aluno, `CurriculoImpressao`
(`src/components/CurriculoImpressao.tsx`), aberta no crachá digital — direto ou
pelo deep-link `?curriculo=1` vindo do cartão.

## Mídia

As imagens da galeria do perfil, na coluna `alunos.midias` (JSONB). Cada item é
a URL pública de um arquivo no Vercel Blob mais a legenda — o upload é direto do
navegador para o store, e a URL (não o byte) é o que entra no formulário.
`src/lib/blob.ts` faz a ponte e `src/app/api/upload/route.ts` assina o token
depois de conferir sessão, caminho e ritmo. Ver `midia.md`.

## Vídeo

O vídeo do perfil, na coluna `alunos.videos` (JSONB), guardado como
`{ id, tipo, titulo? }` — o id da plataforma, **nunca** a URL que o aluno colou.
O embed é montado por `urlEmbed` (`src/lib/video.ts`) sobre uma allowlist de
dois hosts, e o `<iframe>` só nasce ao clique, em `VideoEmbed`. Migration
`src/sql/013_videos_do_aluno.sql`.

## Cor de perfil / capa

A aparência que o aluno escolhe: `alunos.cor_perfil` (uma das cores da paleta,
validada contra o `CHECK` do banco) e `alunos.banner_url` (a capa). Resolvidas
por `corDoAluno()` em `src/lib/cores.ts`, que prefere a escolha do aluno e cai
na cor da sala quando ele não escolheu. Migration
`src/sql/012_aparencia_do_aluno.sql`.

## Slug

O identificador legível do perfil individual, `alunos.slug`
(`^[a-z0-9-]{2,80}$`, até 60 chars). Gerado por `slugificar()` e `slugUnico()`
em `src/lib/slug.ts` (o 2º "Ana Silva" vira `ana-silva-2`). Vive na rota
`/alunos/[slug]` e é o link que o aluno compartilha.

## Fold

A normalização de texto da busca em `src/lib/busca.ts`: normaliza NFD, tira
diacríticos (`\p{M}`), abaixa a caixa e trata o `º` (U+00BA, que o NFD não
decompõe) virando `o`, junto com o `o` digitado — "3ºA", "3oA" e "3A" viram a
mesma busca `3a`. É também o critério de igualdade da importação
(`fold(nome)|sala_id`) e a base de comparação de `normalizarGithub`.

## Porta

Uma das entradas do app, todas no mesmo repositório: a vitrine pública
(`/alunos`), o CRM com login (`/`), o painel do ADM (`/adm`) e as páginas de
identidade (`/u/<slug>`, `/validar/<slug>`, `/alunos/<slug>`). Termo do
`src/app/page.tsx` (capa) e do README.

## Colagem / importação

A funcionalidade de colar a lista da turma (TSV/CSV do Excel ou Sheets) no
painel. O texto cru é parseado por `parseLista()` em `src/lib/importar.ts`
(cabeçalho detectado por nome, separador por maioria, linha com erro vira aviso
numerado) e aplicado por `importarLista()` em `src/app/adm/acoes.ts`, que **não
sobrescreve** link já cadastrado. A prévia roda no navegador via
`src/components/adm/ImportarLista.tsx`.

## Cor de sala

A cor determinística de cada sala, `corDaSala()` em `src/lib/cores.ts`, sobre
as cores do símbolo do SESI (`CORES_SALA`), injetada como `--sala` nos cartões,
no trilho de filtros e no ranking. Mesma cor em qualquer máquina e render, sem
guardar no banco.

## Roseta / LogoSesi

A marca do app. **Os PNGs oficiais do SESI moram no repositório** —
`public/logo-sesi.png`, `logo-sesi-branco.png` e as versões `-icone` — e
`src/components/Roseta.tsx` só escolhe qual servir, alternando por tema via
`.logo-modo-light` / `.logo-modo-dark`. Quem escreve código novo importa
`LogoSesi`; `Roseta` continua exportado no mesmo arquivo como alias para os
imports antigos. A prop `girando` e a classe `logo-sesi-pulse` **não existem
mais**: elas ligavam uma pulsação em loop que só a tela de login usava, e o
único efeito era o "pulo" do logo na carga (saíram na PR #44).

O desenho em SVG nas quatro cores do símbolo foi a versão anterior, e não é
mais o que o app usa.

## Selo

Os rótulos de estado na tabela de alunos e na tela de validação: `selo-fixado`
("Fixado") e `selo-destaque` ("Destaque", com `IconeEstrela` na tabela). Estilo em
`src/app/styles/vitrine.css`, renderizado em `src/components/TabelaAlunos.tsx` e
`src/app/validar/[slug]/page.tsx`.

## Bio

O texto opcional do aluno (até 280), campo `alunos.bio`. Só entra pelo
formulário de um aluno por vez (`criarAluno` em `src/app/adm/acoes.ts`); o
parser da colagem não lê bio. Exibido no cartão e no perfil.
