import assert from "node:assert/strict";
import { test } from "node:test";
import { logger, mascararSegredos } from "../src/lib/debug.ts";

/**
 * O que o `logger.error` deixa no log quando o erro é do PostgREST.
 *
 * `PostgrestError` **estende `Error`** (`@supabase/postgrest-js/dist/index.d.ts`),
 * então `erro instanceof Error ? erro.message` mandava só a mensagem — e o
 * `code` (`23505`, `42501`) e o `hint` ficavam de fora. O `hint` é justamente
 * onde o Postgres diz o conserto, como o próprio pacote avisa no doc do tipo:
 * "Always log the full object; logging only `error.message` hides the hint".
 *
 * Quem exercita o fix é o **primeiro** teste (roda vermelho sem ele); os outros
 * são guarda de não-regressão — o log não virou depósito de dado de aluno, o
 * `Error` sem os campos não ganhou sujeira, e o mascaramento de segredo continua
 * valendo para o que não é `Error`. O último chama `mascararSegredos` direto, sem
 * passar pelo logger: é teste da função, não do caminho.
 */

/** Captura o que o `logger` escreveu, sem sujar a saída do runner. */
function capturarErro(fn) {
  const original = console.error;
  const linhas = [];
  console.error = (...args) => linhas.push(args);
  try {
    fn();
  } finally {
    console.error = original;
  }
  return linhas;
}

/** Um erro com a forma do `PostgrestError`: estende `Error`, com os campos extras. */
function erroDoPostgrest() {
  return Object.assign(new Error('duplicate key value violates unique constraint "alunos_username_key"'), {
    details: "Key (username)=(theo) already exists.",
    hint: "Use um username que ainda não existe.",
    code: "23505",
  });
}

test("o erro do PostgREST sai no log com o code e o hint", () => {
  const linhas = capturarErro(() =>
    logger.error("estrela", "falha ao gravar o voto", erroDoPostgrest()),
  );

  assert.equal(linhas.length, 1);
  const [, saida] = linhas[0];
  assert.match(saida, /23505/, "o `code` do PostgREST ficou de fora do log");
  assert.match(saida, /ainda não existe/, "o `hint` ficou de fora do log");
  assert.match(saida, /alunos_username_key/, "a mensagem em si ficou de fora");
});

test("o `details` fica de fora — é ele que carrega o valor da coluna", () => {
  const linhas = capturarErro(() => logger.error("AUTH", "falha no cadastro", erroDoPostgrest()));

  const [, saida] = linhas[0];
  assert.doesNotMatch(
    saida,
    /\(theo\)/,
    "o valor da chave foi para o log pelo `details`: o log não é lugar de dado de aluno",
  );
});

test("o `code` do Node (`ENOENT`) entra pela mesma porta", () => {
  const erro = Object.assign(new Error("no such file or directory"), { code: "ENOENT" });
  const linhas = capturarErro(() => logger.error("PERF", "falha ao ler o arquivo", erro));

  assert.match(linhas[0][1], /code=ENOENT/);
});

test("erro sem os campos extras sai só com a mensagem, sem sujeira", () => {
  const linhas = capturarErro(() => logger.error("AUTH", "falha", new Error("caiu a rede")));

  const [, saida] = linhas[0];
  assert.equal(saida, "caiu a rede");
});

test("o que não é Error continua passando pelo mascaramento", () => {
  const token = "sbp_abcdefghijklmnopqrstuvwxyz0123456789";
  const linhas = capturarErro(() => logger.error("AUTH", "falha", { token }));

  const [, saida] = linhas[0];
  assert.deepEqual(saida, { token: "[REDACTED]" });
});

test("o mascaramento de segredo continua valendo para string solta", () => {
  const token = "sbp_abcdefghijklmnopqrstuvwxyz0123456789";
  assert.equal(mascararSegredos(token), "sbp_...6789");
});
