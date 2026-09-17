---
type: skill
name: Refactoring
description: Refatorar o alunos-sesi sem mudar comportamento, respeitando a rede de segurança real (testes só das funções puras de src/lib/) e as amarras por string (classes do globals.css, chaves de FormData, data-fixado). Use quando for extrair função, remover código morto, renomear símbolo, ou reorganizar módulo.
skillSlug: refactoring
phases: [E]
generated: 2026-09-17
status: filled
scaffoldVersion: "2.0.0"
---
## Workflow

1. Saiba o que está coberto: `tests/puros.test.mjs` testa só as funções puras de `src/lib/` (`busca.ts`, `importar.ts`, `links.ts`, `ranking.ts`, `slug.ts`). Página, componente, Server Action e Route Handler não têm teste — neles, a rede é `npm run build` mais o caminho no navegador.
2. Remova código morto primeiro, em commit separado. Refactor e remoção no mesmo commit escondem o que mudou de comportamento.
3. Faça um tipo de mudança por vez (extrair, renomear, mover, simplificar) e rode a verificação a cada passo.
4. Grep antes de renomear ou deletar qualquer símbolo — as amarras deste repo são por string (veja abaixo).
5. Rode `npm run typecheck && npm test && npm run build` e percorra o fluxo tocado no navegador.
6. Se o teste quebrar, você mudou comportamento: volte o passo em vez de ajustar o teste.

## Amarras por string (o grep que salva)

| Símbolo | Onde mais aparece |
|---|---|
| Classe CSS (`className="linha-adm"`) | `src/app/globals.css` — renomear no TSX sem o CSS deixa a tela sem estilo, e o build não reclama |
| `data-fixado` | seletor `.aluno[data-fixado]` e `.linha-adm[data-fixado]` em `src/app/globals.css` |
| `--sala` (custom property) | consumida no CSS com fallback `var(--sala, var(--accent))`; é escrita no TSX via `style={{ ["--sala"]: corDaSala(...) }}` |
| Nomes de campo de `FormData` | `texto(formData, "nome")` em `src/app/adm/acoes.ts` casa com o `name="nome"` de `src/components/adm/FormAluno.tsx`; o mesmo vale para `id`/`campo` em `PainelAlunos.tsx` e `lista` em `ImportarLista.tsx` |
| `CAMPOS_ALUNO` | lista de colunas usada por `listarAlunos()` e `alunoPorSlug()` em `src/lib/dados.ts` |
| `COOKIE_ADM` / `COOKIE_VISITANTE` | `src/lib/sessao.ts` define, `src/proxy.ts`, `src/app/adm/` e `src/app/api/estrela/route.ts` consomem; renomear invalida cookie de todo mundo |
| `ESTADO_INICIAL` / tipo `Estado` | `src/app/adm/estado.ts` é importado por `acoes.ts` e pelos formulários do painel |
| `TODAS` / `ESTRELADOS` | `src/lib/busca.ts` define, `src/components/Vitrine.tsx` compara |
| Regex de `links.ts` | espelham as constraints `github_handle` e `linkedin_url` em `src/sql/001_schema.sql` |

## Regras deste repositório

- **Não dê import aos módulos folha.** `busca.ts`, `importar.ts`, `links.ts`, `ranking.ts`, `slug.ts` e `cores.ts` são carregados direto pelo `node --experimental-strip-types --test`, que não resolve `@/` nem import sem extensão. Código compartilhado vira um terceiro módulo folha.
- **Não unifique `estado.ts` em `acoes.ts`.** O tipo e a constante moram fora porque arquivo `"use server"` só exporta função async. Não é duplicação.
- **Movimento de validação mantém os dois lados em sincronia.** Se a normalização sai de `links.ts` para outro lugar, o regex continua igual ao da CHECK do banco.
- **`globals.css` tem quase mil linhas e nenhum uso órfão é acusado por ferramenta.** Antes de extrair ou consolidar, levante o que não é usado: cruze `className="..."` de `src/components/**` e `src/app/**` com os seletores do CSS, e remova o resto em commit próprio.
- **`src/lib/dados.ts` é a única ponte com o Supabase.** Refactor que mexe em `CAMPOS_ALUNO` ou troca `clientePublico()` por `clienteAdmin()` muda o modelo de acesso — isso é feature, não refactor.
- **Ordenação passa por `ordenarAlunos`/`rankingSalas`.** Não troque por `sort` inline: o desempate determinístico é contrato.
- **Não refatore `.context/`** junto com o código: skill e doc têm o próprio ciclo.

## Exemplo

```
Antes de extrair: src/components/Vitrine.tsx calcula o retrato da turma
inline (total, comLinkedin, comGithub e o percentual) e ordena as salas
com rankingSalas.

Passo 1 (commit): extrair o cálculo para uma função pura em src/lib/.
Como o módulo é folha, o tipo do parâmetro é declarado localmente, do
jeito que ranking.ts declara Ranqueavel — nada de import.
Passo 2 (commit): teste em tests/puros.test.mjs com total zero (o
percentual tem que ser 0, não NaN).
Passo 3: npm run typecheck && npm test && npm run build, e abrir
/alunos para conferir os quatro números do retrato.
```

## Quality Bar

- Um tipo de mudança por commit; nada de renomear e extrair no mesmo passo.
- `npm test` verde depois de cada passo. Teste quebrado = comportamento mudado.
- Nenhum arquivo deletado sem grep de referências (barrel não existe aqui, mas import por `@/...` e uso em `style`/`className` existem).
- Diff de refactor sem mudança de texto visível na tela, sem mudança de nome de classe e sem mudança de nome de cookie.
- Saída de `npm run typecheck`, `npm test` e `npm run build` colada no fim.

## Resource Strategy

- `scripts/`: só se a limpeza de CSS virar rotina e valer um script que lista seletor sem uso.
- `references/`: só para o mapa completo de classes do `globals.css`.
- `assets/`: nada.
