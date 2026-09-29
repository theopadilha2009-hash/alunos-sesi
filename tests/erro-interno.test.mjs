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
 *     anônimo. Esse outro formato — `throw new Error` com o texto do banco
 *     dentro — é o que o **segundo teste** deste arquivo cobre, agora que
 *     `src/lib/dados.ts` parou de interpolar `.message` nos dez pontos que tinha.
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

/**
 * O outro formato: `throw new Error(\`…: ${error.message}\`)`.
 *
 * É a mesma matéria-prima por outra porta. O texto do PostgREST nomeia tabela,
 * constraint e valor; ele pertence ao `logger.error`, e quem é lançado dali para
 * cima carrega uma frase da casa. O caso que originou esta varredura foi
 * `src/lib/dados.ts`, com dez pontos assim — e o padrão certo já estava escrito
 * no repo, em `garantirSala` (`src/app/adm/acoes.ts:109-113`), com o comentário
 * dizendo exatamente por quê: a mensagem antiga subia com o jargão embutido.
 *
 * Por que dez pontos sem ninguém ver: em produção o Next **sanitiza** a mensagem
 * de erro de Server Component, então o jargão nunca chegou à tela de ninguém —
 * o único lugar que renderiza `error.message` é o `<details>` de desenvolvimento
 * do `src/app/error.tsx`. Não é vazamento; é a mesma matéria-prima do vazamento,
 * esperando a primeira tela que renderizar a mensagem sem sanitização no meio.
 *
 * O que esta varredura NÃO pega — de novo a lista é longa de propósito:
 *
 *   - o texto cru que entra por fora da interpolação: `"x" + error.message`,
 *     `String(error)`, `JSON.stringify(error)`, `error["message"]`, `error.stack`;
 *   - `throw new Error(frase, { cause: error })` — o `cause` não passa pela
 *     template, e o que o Next faz com ele na serialização é assunto dele;
 *   - o erro que entra na frase por uma variável — `const t = error.message;
 *     throw new Error(t)` —, que é o mesmo furo do `lastError` do `/api/health`;
 *   - `throw` que não é `new Error` (uma classe própria, `Promise.reject`);
 *   - e, o mais importante: **esta varredura não exige que o erro vá para o log**.
 *     Ela impede o jargão de virar mensagem; ela não garante que alguém consiga
 *     diagnosticar depois. Apagar o `logger.error` de uma dessas funções deixa o
 *     teste verde e o erro invisível. Esse é o lado que o revisor segura.
 *
 * Travar a vizinhança (`logger.error` na mesma função) foi descartado: é a mesma
 * conta por janela que o `endosso.test.mjs` levou quatro rodadas para acertar, e
 * aqui ela seria mais fraca — a informação pode legitimamente ir para o log por
 * outro caminho, e um `logger.error` a três linhas de distância não prova nada.
 */

const SRC = fileURLToPath(new URL("../src/", import.meta.url));

/**
 * Os arquivos onde esta classe já mordeu, e que a varredura precisa alcançar.
 *
 * Mesma ideia do `ESPERADAS` de cima: não é teto nem contagem, é o guard de
 * "olhou o lugar certo". `auth.ts` foi o vazamento que o PR #60 fechou à mão;
 * `dados.ts` é onde a varredura nasceu.
 */
const JARDAS = ["lib/auth.ts", "lib/dados.ts"];

/** Todo `.ts` e `.tsx` de `src/`, recursivo. */
function fontes(dir, achados = []) {
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      fontes(caminho, achados);
    } else if (entrada.endsWith(".ts") || entrada.endsWith(".tsx")) {
      achados.push(caminho);
    }
  }
  return achados;
}

/**
 * O jargão **interpolado** numa frase lançada: `throw new Error(\`… ${erro.x} …\`)`.
 *
 * A `${` antes do campo é load-bearing: sem ela, a palavra "message" escrita na
 * prosa de uma mensagem da casa reprovaria. O `[^}]*` atravessa quebra de linha
 * e para no primeiro `}` — que é onde a interpolação acaba nos casos reais
 * (`${error.message}`, `${err?.message}`, `${(e as Error).message}`).
 *
 * `.details` entra junto porque é o campo que ecoa o **valor** da coluna
 * (`Key (username)=(theo) already exists.`), e `.hint`/`.stack` pelo mesmo
 * motivo do `.message`: são diagnóstico, não frase.
 */
const JARGAO = /throw new Error\(\s*`[^`]*\$\{[^}]*\.(?:message|details|hint|stack)[^}]*\}/g;

test("nenhum `throw new Error` carrega o texto cru do banco", () => {
  const arquivos = fontes(SRC);
  const relativos = arquivos.map((caminho) => relative(SRC, caminho));

  for (const jardas of JARDAS) {
    assert.ok(
      relativos.includes(jardas),
      `a varredura perdeu o alvo: ${jardas} não está em src/`,
    );
  }

  const vazamentos = [];
  for (const caminho of arquivos) {
    const texto = readFileSync(caminho, "utf8");
    for (const achado of texto.matchAll(JARGAO)) {
      const linha = texto.slice(0, achado.index).split("\n").length;
      vazamentos.push(`${relative(SRC, caminho)}:${linha}`);
    }
  }

  assert.deepEqual(
    vazamentos,
    [],
    "texto cru do banco virando frase lançada — ele pertence ao logger.error, " +
      "e quem sobe daqui é uma frase da casa",
  );
});
