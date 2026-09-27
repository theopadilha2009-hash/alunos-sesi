import assert from "node:assert/strict";
import { test } from "node:test";
import { descricaoDoRepo, quandoDoRepo, tituloDoRepo } from "../src/lib/github.ts";

test("tituloDoRepo humaniza hífen, underline e caixa", () => {
  assert.equal(tituloDoRepo("robo-seguidor-de-linha"), "Robo seguidor de linha");
  assert.equal(tituloDoRepo("meu_projeto_final"), "Meu projeto final");
  assert.equal(tituloDoRepo("API"), "API");
  assert.equal(tituloDoRepo("a--b"), "A b");
});

test("tituloDoRepo corta no teto de 80 do sanitizador de título", () => {
  assert.equal(tituloDoRepo("x".repeat(300)).length, 80);
});

test("descricaoDoRepo usa a linguagem quando não há descrição", () => {
  assert.equal(descricaoDoRepo({ descricao: "", linguagem: "C++" }), "Projeto em C++.");
  assert.equal(descricaoDoRepo({ descricao: "", linguagem: null }), "");
  assert.equal(
    descricaoDoRepo({ descricao: "Feito na aula", linguagem: "Python" }),
    "Feito na aula",
  );
});

test("quandoDoRepo formata a data e recusa o que não é data", () => {
  assert.equal(quandoDoRepo("2026-03-14T10:22:31Z"), "14/03/2026");
  assert.equal(quandoDoRepo(""), null);
  assert.equal(quandoDoRepo("ontem"), null);
});