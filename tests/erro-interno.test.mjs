import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Detalhe interno de erro não sai no corpo de uma rota de API.
 *
 * `error.message` do PostgREST nomeia tabela, constraint e às vezes o valor —
 * `duplicate key value violates unique constraint "votos_pkey"` é diagnóstico
 * para quem lê o log, não frase para quem clicou na estrela. O projeto já tem
 * essa regra escrita em `src/app/adm/acoes.ts` (`motivoDaFalha` traduz o código
 * e manda o erro real para o log); a rota da estrela fazia o contrário, e a
 * revisão do PR #57 achou.
 *
 * Nenhum tipo pega isso: o corpo é um objeto literal, e a mensagem é uma string
 * como outra qualquer. Quem pega é a varredura — a mesma ideia do
 * `endosso.test.mjs` e da varredura de classe em `importacao.test.mjs`.
 *
 * O que esta varredura NÃO pega — a lista é longa de propósito, porque cada
 * item é um jeito de reintroduzir o vazamento com o CI verde:
 *
 *   - corpo aninhado antes do `.message` — `{ erro: { codigo: error.code },
 *     texto: error.message }`; o `}` do objeto de dentro fecha o match;
 *   - `NextResponse.json(error.message, { status: 500 })`, sem as chaves;
 *   - erro que não é `.message` — `String(error)`, `error.details`,
 *     `error.hint`, `error.stack`, `JSON.stringify(error)`, `e["message"]`;
 *   - `.message` fora do corpo — `{ status: 500, statusText: error.message }`;
 *   - `new Response(...)` ou `Response.json(...)` no lugar de `NextResponse`;
 *   - mensagem que passa por uma variável antes do corpo (o `lastError` do
 *     `/api/health`, que só existe no ramo autenticado do ADM e é deliberado);
 *   - rota fora de `src/app/api`. Não é hipótese: o PR #60 fechou duas em
 *     `src/lib/auth.ts`, onde `error.message` ia para a tela de cadastro de um
 *     anônimo. E `src/lib/dados.ts` ainda interpola `.message` em
 *     `throw new Error` (10 pontos — registrados em `pendencias-de-decisao.md`,
 *     sem vazamento confirmado porque o Next sanitiza erro de Server Component).
 *
 * O que segura esses casos é o revisor, não o teste. O valor daqui é travar o
 * formato que existe hoje: corpo plano com `.message` num literal.
 */

const API = fileURLToPath(new URL("../src/app/api", import.meta.url));

/**
 * As rotas que a varredura precisa ter alcançado.
 *
 * É o guard de "a varredura olhou o lugar certo" — não um teto. Rota nova em
 * `src/app/api` é varrida sozinha, sem entrar nesta lista; o que ela impede é o
 * teste passar verde com o diretório vazio ou com o caminho trocado. Contar
 * arquivos (`>= 3`) não servia: hoje `src/app/api` tem exatamente três `.ts`,
 * então apagar uma rota legítima quebraria o CI sem vazamento nenhum.
 */
const ESPERADAS = ["estrela/route.ts", "health/route.ts", "upload/route.ts"];

/** Todo `.ts` de `src/app/api`, recursivo. */
function rotas(dir, achadas = []) {
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      rotas(caminho, achadas);
    } else if (entrada.endsWith(".ts")) {
      achadas.push(caminho);
    }
  }
  return achadas;
}

/**
 * Corpo literal de `NextResponse.json` que carrega um `.message`.
 *
 * A varredura roda sobre o **arquivo inteiro**, não linha a linha: o corpo pode
 * estar espalhado em três linhas (`NextResponse.json(` numa, `{ error: (error as
 * Error).message }` na seguinte), e a versão por linha deixava esse caso passar.
 *
 * `[^}]*` atravessa quebra de linha, mas para no **primeiro** `}` — não no fim
 * do literal. Para o corpo plano que existe hoje nas três rotas isso basta; o
 * caso aninhado está na lista de lacunas lá em cima.
 */
const VAZAMENTO = /NextResponse\.json\(\s*\{[^}]*\.message[^}]*\}/g;

test("nenhuma rota de API devolve `.message` de erro no corpo", () => {
  const arquivos = rotas(API);
  const relativos = arquivos.map((caminho) => relative(API, caminho));

  for (const esperada of ESPERADAS) {
    assert.ok(
      relativos.includes(esperada),
      `a varredura perdeu o alvo: ${esperada} não está em src/app/api`,
    );
  }

  const vazamentos = [];
  for (const caminho of arquivos) {
    const texto = readFileSync(caminho, "utf8");
    for (const achado of texto.matchAll(VAZAMENTO)) {
      const linha = texto.slice(0, achado.index).split("\n").length;
      vazamentos.push(`${relative(API, caminho) || caminho}:${linha}`);
    }
  }

  assert.deepEqual(
    vazamentos,
    [],
    "mensagem de erro interna indo para o cliente — ela pertence ao log",
  );
});
