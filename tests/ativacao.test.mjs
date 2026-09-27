import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALFABETO,
  TAMANHO_CODIGO,
  formatarCodigo,
  gerarCodigo,
  hashCodigo,
  normalizarCodigo,
} from "../src/lib/ativacao.ts";

// ── o alfabeto: é ditado em voz alta, não copiado ───────────────────────────

test("o alfabeto é o Crockford Base32, sem as letras que se confundem", () => {
  // O professor lê o código em voz alta e o aluno digita. Crockford tira I, L,
  // O e U do alfabeto justamente por isso — e depois dobra de volta o que o
  // leitor confundiu. U fica de fora para não formar palavra feia por acaso.
  assert.equal(ALFABETO.length, 32);
  for (const ambigua of ["I", "L", "O", "U"]) {
    assert.ok(!ALFABETO.includes(ambigua), `o alfabeto não pode conter ${ambigua}`);
  }
  for (const c of ALFABETO) assert.ok(!"ILOU".includes(c), `ambíguo no alfabeto: ${c}`);
});

// ── normalizar: o aluno erra a digitação de formas previsíveis ──────────────

test("aceita o código com e sem o prefixo SESI, com e sem hífen", () => {
  const alvo = "ABCD2345";
  assert.equal(normalizarCodigo("ABCD-2345"), alvo);
  assert.equal(normalizarCodigo("abcd-2345"), alvo);
  assert.equal(normalizarCodigo("ABCD2345"), alvo);
  assert.equal(normalizarCodigo("SESI-ABCD-2345"), alvo);
  assert.equal(normalizarCodigo("sesi abcd 2345"), alvo);
});

test("ignora espaço, hífen e pontuação que o aluno digitar a mais", () => {
  assert.equal(normalizarCodigo("  ABCD 2345  "), "ABCD2345");
  assert.equal(normalizarCodigo("ABCD.2345"), "ABCD2345");
  assert.equal(normalizarCodigo("SESI-ABCD-2345\n"), "ABCD2345");
});

test("dobra as letras que o leitor confunde de volta no dígito", () => {
  // Quem lê "zero" digita O, quem lê "um" digita I ou L. Como nenhuma das três
  // está no alfabeto, a intenção não é ambígua: O vira 0, I e L viram 1.
  assert.equal(normalizarCodigo("ABCD234O"), "ABCD2340");
  assert.equal(normalizarCodigo("ABCD234I"), "ABCD2341");
  assert.equal(normalizarCodigo("ABCD234L"), "ABCD2341");
  assert.equal(normalizarCodigo("OIL23456"), "01123456");
});

test("o prefixo SESI é removido antes da dobra, não depois", () => {
  // "SESI" tem o I, que a dobra transformaria em 1. Se a ordem se invertesse,
  // o prefixo viraria "SES1" e sobraria um caractere a mais no código.
  assert.equal(normalizarCodigo("SESI-ABCD-2345"), "ABCD2345");
  assert.equal(normalizarCodigo("SES1-ABCD-2345"), "ABCD2345");
});

test("código com tamanho errado volta vazio, para o chamador recusar", () => {
  assert.equal(normalizarCodigo(""), "");
  assert.equal(normalizarCodigo("ABC"), "");
  assert.equal(normalizarCodigo("ABCD234"), "");
  assert.equal(normalizarCodigo("ABCD23456"), "");
  assert.equal(normalizarCodigo("SESI"), "");
});

// ── gerar ───────────────────────────────────────────────────────────────────

test("o código gerado tem o tamanho e o alfabeto certos", () => {
  for (let i = 0; i < 200; i++) {
    const c = gerarCodigo();
    assert.equal(c.length, TAMANHO_CODIGO, `tamanho errado: ${c}`);
    for (const ch of c) assert.ok(ALFABETO.includes(ch), `fora do alfabeto: ${ch} em ${c}`);
  }
});

test("o código gerado já é a forma normalizada — ida e volta não muda", () => {
  for (let i = 0; i < 100; i++) {
    const c = gerarCodigo();
    assert.equal(normalizarCodigo(c), c);
    assert.equal(normalizarCodigo(formatarCodigo(c)), c);
  }
});

test("dois códigos seguidos não se repetem (amostra grande)", () => {
  // Não é garantia matemática — o índice único no banco é a garantia —, mas se
  // `gerarCodigo` fosse determinística os 500 dariam o mesmo.
  const vistos = new Set(Array.from({ length: 500 }, gerarCodigo));
  assert.ok(vistos.size > 495, `só ${vistos.size} códigos distintos em 500`);
});

// ── formatar: o que o ADM lê na tela ────────────────────────────────────────

test("formatar põe o prefixo e separa em dois blocos", () => {
  assert.equal(formatarCodigo("ABCD2345"), "SESI-ABCD-2345");
});

// ── hash: é ele que vai para o banco, nunca o código ────────────────────────

test("o hash é determinístico — é o que permite buscar por índice", () => {
  // Diferente da senha (argon2, salt aleatório), aqui a busca É por hash:
  // `WHERE codigo_hash = $1`. Sem determinismo, o resgate varreria a tabela.
  assert.equal(hashCodigo("ABCD2345"), hashCodigo("ABCD2345"));
  assert.match(hashCodigo("ABCD2345"), /^[0-9a-f]{64}$/);
});

test("códigos diferentes dão hashes diferentes", () => {
  assert.notEqual(hashCodigo("ABCD2345"), hashCodigo("ABCD2346"));
});

test("o hash não deixa o código aparecer", () => {
  assert.ok(!hashCodigo("ABCD2345").toUpperCase().includes("ABCD2345"));
});
