import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_USERNAME, MIN_USERNAME, normalizarUsername, validarUsername } from "../src/lib/username.ts";

// ── normalizarUsername ──────────────────────────────────────────────────────

test("normalizarUsername tira espaco das pontas e baixa a caixa", () => {
  assert.equal(normalizarUsername("  Theo.Padilha  "), "theo.padilha");
});

test("normalizarUsername não mexe no meio do endereço", () => {
  assert.equal(
    normalizarUsername(" Theo_Padilha@Estudante.SESISenai.org.br "),
    "theo_padilha@estudante.sesisenai.org.br",
  );
});

// ── o que o cadastro já aceitava ────────────────────────────────────────────

test("username curto continua valendo", () => {
  for (const u of ["theo1234", "ana", "pedro.henrique", "maria_silva", "joao-2"]) {
    assert.equal(validarUsername(u), null, `${u} deveria ser válido`);
  }
});

test("os limites do banco são o piso e o teto", () => {
  // usuarios_username_check: length entre 3 e 50.
  assert.equal(MIN_USERNAME, 3);
  assert.equal(MAX_USERNAME, 50);
  assert.notEqual(validarUsername("ab"), null, "2 caracteres deveria recusar");
  assert.equal(validarUsername("abc"), null);
  assert.equal(validarUsername("a".repeat(50)), null);
  assert.notEqual(validarUsername("a".repeat(51)), null, "51 caracteres deveria recusar");
});

test("string vazia e só espaços são recusadas", () => {
  assert.notEqual(validarUsername(""), null);
  assert.notEqual(validarUsername("   "), null);
});

// ── o que passou a valer: o e-mail institucional ────────────────────────────

test("e-mail institucional é aceito — era o que o cadastro recusava", () => {
  for (const u of [
    "theo_padilha@estudante.sesisenai.org.br",
    "lucas_r_bento@sesisenai.org.br",
    "aluno@estudante.sesisenai.org",
  ]) {
    assert.equal(validarUsername(u), null, `${u} deveria ser válido`);
  }
});

test("o e-mail do Théo cabe no teto do banco", () => {
  const email = "theo_padilha@estudante.sesisenai.org.br";
  assert.ok(email.length <= MAX_USERNAME, `${email.length} > ${MAX_USERNAME}`);
  assert.equal(validarUsername(email), null);
});

test("só a arroba foi adicionada — o resto ainda é recusado", () => {
  for (const u of ["nome sobrenome", "nome/silva", "nome\\silva", "nome+tag", "nome!", "(nome)"]) {
    assert.notEqual(validarUsername(u), null, `${u} deveria ser recusado`);
  }
});

test("aspas e barra não passam — o valor não vira SQL nem caminho", () => {
  for (const u of ["o'brien", 'nome"x', "a;drop", "nome%20silva", "../../etc/passwd"]) {
    assert.notEqual(validarUsername(u), null, `${u} deveria ser recusado`);
  }
});

test("a caixa alta é recusada crua, mas o cadastro normaliza antes", () => {
  // `validarUsername` recebe o valor já normalizado; quem chama é que baixa a caixa.
  assert.notEqual(validarUsername("Theo1234"), null);
  assert.equal(validarUsername(normalizarUsername("Theo1234")), null);
});
