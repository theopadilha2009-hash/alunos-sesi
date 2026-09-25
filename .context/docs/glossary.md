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
slug, sala, LinkedIn, GitHub, bio (até 280), foto (campo `foto_url` sem uso
hoje), `fixado`, `destaque` e a contagem `estrelas`.

## Sala

A turma — `public.salas`; tipo `Sala` em `src/lib/tipos.ts`; `listarSalas` em
`src/lib/dados.ts`. Nome como `"3ºA"`, com curso e turno opcionais e uma
`ordem` para exibição. A cor de cada sala vem de `corDaSala()` em
`src/lib/cores.ts` (hash do nome sobre as quatro cores do símbolo) e é injetada
como a variável `--sala`. Sempre pesquisável na forma `3ºA`/`3oA`/`3A` via
`fold`.

## Vitrine

A porta pública, `/alunos`. Componente `src/components/Vitrine.tsx` (client),
alimentado por `src/app/alunos/page.tsx` (server). Tem busca, filtro por sala,
o atalho "Meus estrelados", o retrato com os números da turma, a grade de
cartões e o ranking das salas.

## Painel

A porta restrita, `/adm`. `src/app/adm/page.tsx` (server) e os componentes
`src/components/adm/*`. Toda mudança sai de uma Server Action em
`src/app/adm/acoes.ts`.

## ADM

Quem tem a chave do link secreto (`ADM_CHAVE`). Não é usuário com login:
identidade é o cookie `sesi.adm` (HMAC da chave). Ver `security.md`.

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
em `src/app/api/estrela/route.ts`.

## Crachá

O cookie `sesi.adm` que dá acesso ao painel. Emite em
`src/app/adm/[chave]/route.ts` via `crachaAdm()` e valida com `crachaValido()`
(`src/lib/sessao.ts`). Guarda o **HMAC** da chave (`assinar("adm-v1")`), não a
chave — trocar `ADM_CHAVE` invalida todos os crachás. Válido por 30 dias
(`TRINTA_DIAS`).

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

Uma das duas entradas do app: a vitrine pública (`/alunos`) e o painel do ADM
(`/adm`). Termo do `src/app/page.tsx` (capa), que apresenta as duas portas, e do
README.

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

## Roseta

A marca do app: quatro arcos nas cores do símbolo girando em volta de um miolo,
desenhada em SVG em `src/components/Roseta.tsx`. É desenho próprio — a logo
oficial do SESI é marca registrada e não mora no repositório.

## Selo

Os rótulos de estado no cartão e no perfil: `selo-fixado` ("Fixado") e
`selo-adm` ("★ Destaque do ADM"). Estilo em `src/app/styles/vitrine.css`, renderizado
em `src/components/CartaoAluno.tsx` e `src/app/alunos/[slug]/page.tsx`.

## Bio

O texto opcional do aluno (até 280), campo `alunos.bio`. Só entra pelo
formulário de um aluno por vez (`criarAluno` em `src/app/adm/acoes.ts`); o
parser da colagem não lê bio. Exibido no cartão e no perfil.
