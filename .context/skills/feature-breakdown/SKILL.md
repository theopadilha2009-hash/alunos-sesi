---
type: skill
name: Feature Breakdown
description: Quebrar uma feature do alunos-sesi em tarefas na ordem schema -> função pura com teste -> leitura de dados -> página/Server Action -> componente, com critério de aceite por comando real. Use quando for planejar feature nova na vitrine ou no painel do ADM, fatiar tarefa grande, ou estimar o que dá para fazer em paralelo.
skillSlug: feature-breakdown
phases: [P]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Escreva o comportamento em uma frase, do ponto de vista de quem usa ("o ADM consegue exportar a turma em CSV").
2. Desça a feature pelas cinco camadas do repo, nesta ordem: banco → função pura → leitura → servidor → cliente. Cada camada só depende das de cima.
3. Marque o que já existe: boa parte das features daqui se resolve só com `src/lib/busca.ts`, `src/lib/ranking.ts` e a view `retrato_salas`, sem schema novo.
4. Dê a cada tarefa um critério de aceite com o comando que prova (`npm test`, `npm run build`, `./scripts/db-query.sh ...`, ou o caminho no navegador).
5. Aponte as dependências e o que pode ir em paralelo.
6. Levante os riscos antes de codar: RLS nova, mudança de slug, troca de cookie, escrita em massa.

## As camadas, com o arquivo de cada uma

| Camada | Arquivo | Depende de |
|---|---|---|
| 1. Banco | `src/sql/001_schema.sql` | nada |
| 2. Função pura | `src/lib/busca.ts`, `importar.ts`, `links.ts`, `ranking.ts`, `slug.ts`, `cores.ts` + `tests/puros.test.mjs` | nada |
| 3. Leitura | `src/lib/dados.ts` | 1 |
| 4. Servidor | `src/app/alunos/`, `src/app/adm/`, `src/app/api/estrela/route.ts` | 1, 2, 3 |
| 5. Cliente | `src/components/` | 2 |

Regra que não muda: camada 2 continua folha (zero imports). Se a feature pede normalização compartilhada entre dois módulos folha, ela vira um terceiro módulo folha — não um import cruzado.

## Exemplo

```
## Feature: filtrar a vitrine por turno

### Tarefa 1 — banco (se preciso)
- `salas.turno` já existe em src/sql/001_schema.sql. Se o filtro for por turno
  cadastrado, nada muda no schema.
- Critério: ./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql sem erro.

### Tarefa 2 — função pura
- src/lib/busca.ts: predicado de turno dentro de filtrarAlunos, junto do filtro
  de sala. O módulo é folha, então nada de import.
- Teste em tests/puros.test.mjs antes do código: turno vazio não filtra ninguém,
  turno combinado com sala e busca devolve a interseção.
- Critério: npm test verde, com o caso novo nomeado em português.

### Tarefa 3 — leitura
- src/lib/dados.ts: listarSalas() já devolve `turno`, então nada novo se o filtro
  acontece no cliente.

### Tarefa 4 — servidor
- src/app/alunos/page.tsx: passa `salas` (com turno) para o componente. Nada de
  consulta nova; a página já lê com clientePublico().

### Tarefa 5 — cliente
- src/components/Vitrine.tsx: trilho de fichas por turno ao lado do de sala,
  com aria-pressed e a contagem por turno.
- Critério: com salas de turnos diferentes, "Manhã" mostra só as do turno;
  "Meus estrelados" continua ignorando turno e sala.

### Dependências
5 depende de 2 e 4. 1 e 2 podem ir em paralelo.
```

## Critérios de aceite por camada

```bash
npm run typecheck                                            # tipos, sempre
npm test                                                     # camada 2
npm run build                                                # camadas 4 e 5 (pega boundary e "use server")
./scripts/db-query.sh --dry-run --force -f src/sql/001_schema.sql   # ensaio da camada 1
./scripts/db-query.sh --psql "select * from pg_policies where schemaname = 'public';"   # RLS aplicada
```

Camada 4 e 5 não têm teste automatizado: o aceite é o caminho no navegador (`/alunos`, `/alunos/<slug>`, `/adm`), descrito em passos.

## Riscos a levantar antes

- **RLS**: tabela nova sem `enable row level security` e sem policy fica aberta; a feature só é considerada pronta depois de aplicar com `--psql` e conferir em `pg_policies`.
- **`service_role`**: qualquer leitura/escrita privada nova passa por `clienteAdmin()` em código de servidor. Se a tarefa prevê importar `@/lib/supabase/admin` de um componente, a tarefa está errada — refaça o corte.
- **Slug**: mudar `slugificar` em `src/lib/slug.ts` muda a URL pública dos perfis já cadastrados; o slug é o link que o aluno compartilha.
- **Cookie**: renomear `sesi.visitante` zera os votos de todo mundo; renomear `sesi.adm` desloga o ADM.
- **Importação em massa**: `importarLista` nunca sobrescreve link já cadastrado. Feature que precise sobrescrever é decisão explícita, não efeito colateral.
- **Custo por linha**: a importação faz um `garantirSala` e um insert por linha. Lista de 40 alunos é tranquilo; lista de milhares precisa de outro desenho.

## Quality Bar

- Cada tarefa é verificável sozinha e cabe em uma sessão de trabalho.
- Critério de aceite é comando ou passo de navegador — não é "funciona".
- Toda tarefa diz em qual arquivo ela mexe.
- Dependência entre tarefas está escrita; o que é independente vai marcado para paralelizar.
- Risco levantado tem a mitigação ao lado, não só o aviso.
- Feature que mexe em `src/sql/001_schema.sql` mantém o arquivo idempotente (`create table if not exists`, `drop policy if exists` antes do `create policy`), porque ele é reaplicado inteiro.

## Resource Strategy

- `scripts/`: nada — o plano usa `npm test`, `npm run build` e `scripts/db-query.sh`.
- `references/`: só se a feature tiver um contrato externo longo (formato de CSV, API de terceiro) que não caiba aqui.
- `assets/`: nada.
