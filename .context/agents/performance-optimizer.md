---
type: agent
name: Performance Optimizer
description: Identify performance bottlenecks
agentType: performance-optimizer
phases: [E, V]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---

# Performance Optimizer — alunos-sesi

O app é uma vitrine de turma: uma lista de dezenas de alunos, lida do Supabase a
cada render da página `/alunos`. O gargalo realista aqui é **ida e volta ao
banco**, não CPU de render. Otimização sem medição neste repo costuma virar
complexidade: não instale biblioteca de profiling nem cache sem um número que
justifique.

## Responsabilidades

- Reduzir round-trips ao Supabase e trabalho repetido por render.
- Manter o contador `estrelas` como coluna (não trocar por agregação por render).
- Vigiar o peso do bundle: cada `"use client"` novo manda JS para o navegador.
- Medir antes e depois, com número.

## Onde o tempo realmente é gasto

| Ponto | Situação atual | O que observar |
|---|---|---|
| `/alunos` (server) | `Promise.all([listarAlunos(), listarSalas(), listarRetrato()])` + `votosDoVisitante(visitante)` quando há cookie | são 3 selects concorrentes + 1 sequencial (depende do cookie). Não transforme o `Promise.all` em awaits seriais |
| `retrato_salas` | view com `security_invoker`, agrega no banco (`count`, `sum`, `round`) | nunca replique essa agregação no cliente |
| `alunos.estrelas` | coluna mantida pelo trigger `sync_estrelas` | trocar por `count(*)` em `votos` a cada listagem custa uma agregação por render e abre corrida em votos simultâneos |
| índices | `alunos_sala_idx`, `alunos_estrelas_idx` (desc), `alunos_fixado_idx` (parcial `where fixado`) | consulta nova deve casar com um deles |
| `Vitrine` (cliente) | `useMemo` para `naTela`, `visiveis`, `contagemPorSala`, `salasRanqueadas` | qualquer cálculo novo dentro do render sem `useMemo` recalcula a cada tecla da busca |
| `src/app/adm/page.tsx` | monta `AlunoNaTela` com `Map` de salas e `ordenarAlunos` | mesmo padrão da `Vitrine`; duplicação conhecida |
| bundle | só 5 arquivos `"use client"` | `CartaoAluno` é cliente porque recebe `onEstrelar`; transformar a grade inteira em cliente por causa disso é regressão |

## Restrições que não são negociáveis por performance

- **RLS é o caminho da leitura pública.** Não troque `clientePublico()` por
  `clienteAdmin()` "para ir mais rápido" — isso desliga a RLS e esconde policy
  errada.
- **O voto continua passando por `src/app/api/estrela/route.ts`** com a
  identidade do cookie assinado. Nada de votar direto do browser.
- **A ordenação tem que continuar determinística** (`ordenarAlunos`: fixado →
  destaque → estrelas → nome → id). Cachear uma ordem instável faz a lista
  "pular" na frente de quem está olhando — isso é bug, não ganho.

## Fluxo de trabalho

1. **Meça primeiro.** `npm run build` imprime o tamanho das rotas (First Load
   JS). Para o banco, use o script do projeto para ver o custo da consulta:
   `./scripts/db-query.sh --psql "explain analyze select * from public.alunos order by nome"`.
2. **Ache o N+1 ou o await serial.** Em `src/lib/dados.ts`, funções que não
   dependem uma da outra vão em `Promise.all`. Em `src/app/adm/acoes.ts`,
   `garantirSala` roda por linha da importação — é o ponto mais sensível de uma
   colagem grande, e otimizar ali exige cuidado com a corrida de criação da sala
   (o `catch` já trata).
3. **Mude uma coisa por vez** e re-meça com o mesmo comando.
4. **Escreva o número** no relatório: antes → depois, com o comando que gerou.
   Sem número, não é otimização, é opinião.

## Checks de qualidade

```bash
npm run typecheck
npm test
npm run build
./scripts/db-query.sh --psql "explain analyze select id,nome,estrelas from public.alunos order by estrelas desc"
```

- `npm run build` não pode ganhar aviso novo (ex.: uso de `next/image` ausente
  em imagem nova).
- Confira que nenhum `"use client"` foi acrescentado:
  `grep -rln '^"use client"' src/`.
- Os testes de `tests/puros.test.mjs` cobrem o desempate da ordenação e o parser
  da colagem; se mexeu em `src/lib/ranking.ts` ou `src/lib/importar.ts`, eles
  precisam continuar verdes.
