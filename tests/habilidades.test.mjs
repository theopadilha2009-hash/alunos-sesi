import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LISTA_HABILIDADES,
  corHabilidade,
  extrairHabilidades,
  habilidadePermitida,
} from "../src/lib/habilidades.ts";

test("habilidadePermitida aceita o nome exato da lista", () => {
  assert.equal(habilidadePermitida("Python"), true);
  assert.equal(habilidadePermitida("Robótica"), true);
  assert.equal(habilidadePermitida("Backend & SQL"), true);
});

test("habilidadePermitida recusa variacao de caixa", () => {
  // a PK de endossos trata Python e python como habilidades distintas,
  // entao tolerar caixa aqui criaria duas linhas para a mesma competencia
  assert.equal(habilidadePermitida("python"), false);
  assert.equal(habilidadePermitida("PYTHON"), false);
  assert.equal(habilidadePermitida("pYtHoN"), false);
});

test("habilidadePermitida recusa espaco sobrando", () => {
  // " Web Frontend " nao e o nome que vai para o banco
  assert.equal(habilidadePermitida(" Web Frontend "), false);
  assert.equal(habilidadePermitida("Web Frontend"), true);
  assert.equal(habilidadePermitida("Web  Frontend"), false);
});

test("habilidadePermitida recusa entrada que nao e string", () => {
  assert.equal(habilidadePermitida(""), false);
  assert.equal(habilidadePermitida(null), false);
  assert.equal(habilidadePermitida(undefined), false);
  assert.equal(habilidadePermitida(42), false);
  assert.equal(habilidadePermitida({}), false);
  assert.equal(habilidadePermitida(["Python"]), false);
});

test("toda habilidade da lista passa na allowlist", () => {
  // se alguem adicionar habilidade na lista sem ela passar aqui, o endosso trava
  for (const h of LISTA_HABILIDADES) {
    assert.equal(habilidadePermitida(h.nome), true, `"${h.nome}" deveria passar`);
  }
});

test("extrairHabilidades para no teto de 4", () => {
  const bio = "robotica python react sql arduino figma";
  const habs = extrairHabilidades(bio);
  assert.equal(habs.length, 4, "acha 6 mas devolve so as 4 primeiras");
  assert.deepEqual(habs, ["Robótica", "Python", "Web Frontend", "Backend & SQL"]);
});

test("extrairHabilidades devolve vazio sem match, com bio nula e com bio vazia", () => {
  assert.deepEqual(extrairHabilidades("gosto de futebol e de desenhar"), []);
  assert.deepEqual(extrairHabilidades(""), []);
  assert.deepEqual(extrairHabilidades(null), []);
  assert.deepEqual(extrairHabilidades(undefined), []);
});

test("corHabilidade usa a cor da lista e cai no fallback", () => {
  const python = LISTA_HABILIDADES.find((h) => h.nome === "Python");
  assert.equal(corHabilidade("Python"), python.cor);
  assert.equal(corHabilidade("Backend & SQL"), "#2d929e");
  // habilidade desconhecida nao pode sair sem cor
  assert.equal(corHabilidade("Culinaria"), "#3fc2bc");
  assert.equal(corHabilidade(""), "#3fc2bc");
});
