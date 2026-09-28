import assert from "node:assert/strict";
import { test } from "node:test";
import { dataCurta } from "../src/lib/datas.ts";

test("formata a data no padrão brasileiro", () => {
  assert.equal(dataCurta("2026-03-14T10:22:31Z"), "14/03/2026");
});

test("string vazia ou lixo devolve null", () => {
  assert.equal(dataCurta(""), null);
  assert.equal(dataCurta("ontem"), null);
});

test("o fuso é fixo em São Paulo, não o de quem roda o código", () => {
  // 01:00 UTC do dia 15 é 22:00 do dia 14 em São Paulo (UTC-3). Sem o fuso
  // fixo, o servidor da Vercel (UTC) renderizaria 15/03 e o navegador do aluno
  // 14/03 — o mismatch que o React acusa na hidratação. Este teste falha numa
  // máquina em UTC se alguém tirar o `timeZone` da implementação.
  assert.equal(dataCurta("2026-03-15T01:00:00Z"), "14/03/2026");
});
