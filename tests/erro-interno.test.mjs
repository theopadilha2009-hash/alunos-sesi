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
 * O que esta varredura NÃO pega, de propósito: mensagem que passa por uma
 * variável antes de entrar no corpo (como o `lastError` do `/api/health`, que
 * existe só no ramo autenticado do ADM e por isso é deliberado) e resposta
 * montada fora de um literal de `NextResponse.json`. Se um dia uma dessas
 * formas virar vazamento, o revisor pega — não o teste.
 */

const API = fileURLToPath(new URL("../src/app/api", import.meta.url));

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
 * `[^}]*` atravessa quebra de linha e para no fim do literal.
 */
const VAZAMENTO = /NextResponse\.json\(\s*\{[^}]*\.message[^}]*\}/g;

test("nenhuma rota de API devolve `.message` de erro no corpo", () => {
  const arquivos = rotas(API);

  // Se isto cair, a varredura está olhando para o lugar errado.
  assert.ok(
    arquivos.length >= 3,
    `a varredura perdeu o alvo: achou ${arquivos.length} arquivos em src/app/api`,
  );

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
