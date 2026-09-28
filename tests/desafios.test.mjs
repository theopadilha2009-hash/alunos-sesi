import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CATEGORIAS,
  MAX_CRITERIOS,
  MAX_DESCRICAO,
  MAX_PRAZO,
  MAX_TITULO,
  parseCriterios,
  problemaDoDesafio,
} from "../src/lib/desafios.ts";

/** Um desafio publicável; cada teste estraga só o campo que quer testar. */
function desafio(trocas = {}) {
  return {
    titulo: "Robô Seguidor de Linha",
    subtitulo: "Monte um robô que completa o percurso sozinho",
    categoria: "Robótica FLL",
    prazo: "10/11/2026",
    recompensa: "Insígnia de Engenharia",
    descricao: "Use sensores infravermelhos e um controlador PID.",
    criterios: ["Percurso completo", "Código comentado"],
    ...trocas,
  };
}

// ── parseCriterios: o textarea vira a lista do card ────────────────────────

test("uma linha por critério", () => {
  assert.deepEqual(parseCriterios("Primeiro\nSegundo\nTerceiro"), [
    "Primeiro",
    "Segundo",
    "Terceiro",
  ]);
});

test("linha em branco não vira critério vazio", () => {
  // O banco só exige que `criterios` seja array — um item vazio passaria e
  // apareceria como bullet sem texto no card do aluno.
  assert.deepEqual(parseCriterios("Um\n\n\nDois\n   \n"), ["Um", "Dois"]);
});

test("espaço em volta é aparado", () => {
  assert.deepEqual(parseCriterios("  Um  \n\tDois\t"), ["Um", "Dois"]);
});

test("quebra de linha do Windows não deixa \\r no critério", () => {
  assert.deepEqual(parseCriterios("Um\r\nDois\r\n"), ["Um", "Dois"]);
});

test("texto vazio, null e undefined devolvem lista vazia", () => {
  assert.deepEqual(parseCriterios(""), []);
  assert.deepEqual(parseCriterios("   \n  \n"), []);
  assert.deepEqual(parseCriterios(null), []);
  assert.deepEqual(parseCriterios(undefined), []);
});

test("respeita o teto de critérios", () => {
  const muitas = Array.from({ length: MAX_CRITERIOS + 5 }, (_, i) => `Critério ${i + 1}`);
  assert.equal(parseCriterios(muitas.join("\n")).length, MAX_CRITERIOS);
});

// ── problemaDoDesafio: a frase que o ADM lê ────────────────────────────────

test("desafio completo não tem problema", () => {
  assert.equal(problemaDoDesafio(desafio()), null);
});

test("todas as categorias do tipo passam", () => {
  for (const categoria of CATEGORIAS) {
    assert.equal(problemaDoDesafio(desafio({ categoria })), null, categoria);
  }
});

test("categoria inventada é recusada", () => {
  // O card filtra por igualdade com as categorias conhecidas: uma categoria
  // livre criaria um desafio que nenhum filtro do mural alcança.
  assert.match(problemaDoDesafio(desafio({ categoria: "Astronáutica" })), /categoria/i);
});

test("cada campo obrigatório vazio é recusado com a própria frase", () => {
  assert.match(problemaDoDesafio(desafio({ titulo: "" })), /título/i);
  assert.match(problemaDoDesafio(desafio({ subtitulo: "" })), /subtítulo/i);
  assert.match(problemaDoDesafio(desafio({ prazo: "" })), /prazo/i);
  assert.match(problemaDoDesafio(desafio({ recompensa: "" })), /recompensa/i);
  assert.match(problemaDoDesafio(desafio({ descricao: "" })), /descreva/i);
});

test("sem critério nenhum não publica", () => {
  assert.match(problemaDoDesafio(desafio({ criterios: [] })), /critério/i);
});

test("os tetos de tamanho barram o que passa", () => {
  assert.match(problemaDoDesafio(desafio({ titulo: "x".repeat(MAX_TITULO + 1) })), /título/i);
  assert.match(
    problemaDoDesafio(desafio({ descricao: "x".repeat(MAX_DESCRICAO + 1) })),
    /descrição/i,
  );
  // `prazo` é text sem check no banco: sem este teto, o card do aluno aceita
  // um parágrafo inteiro na etiqueta de prazo.
  assert.match(problemaDoDesafio(desafio({ prazo: "x".repeat(MAX_PRAZO + 1) })), /prazo/i);
});

test("o texto exatamente no teto passa", () => {
  assert.equal(problemaDoDesafio(desafio({ titulo: "x".repeat(MAX_TITULO) })), null);
});
