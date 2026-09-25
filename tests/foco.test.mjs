import assert from "node:assert/strict";
import { test } from "node:test";
import { proximoFoco } from "../src/lib/foco.ts";

// A lista de exemplo tem 4 focáveis: índices 0..3.
const TOTAL = 4;

test("no meio da lista o navegador cuida e nao intervimos", () => {
  // Só as pontas são problema: no meio, deixar o Tab seguir é o certo.
  assert.equal(proximoFoco(TOTAL, 1, false), null);
  assert.equal(proximoFoco(TOTAL, 2, false), null);
  assert.equal(proximoFoco(TOTAL, 1, true), null);
  assert.equal(proximoFoco(TOTAL, 2, true), null);
});

test("Tab no ultimo volta para o primeiro", () => {
  assert.equal(proximoFoco(TOTAL, TOTAL - 1, false), 0);
});

test("Shift+Tab no primeiro volta para o ultimo", () => {
  assert.equal(proximoFoco(TOTAL, 0, true), TOTAL - 1);
});

test("foco no container entra na lista pela ponta certa", () => {
  // O container tem tabIndex={-1} e recebe foco ao abrir o dialogo. Se o Tab
  // daqui nao for tratado, o navegador sai do dialogo inteiro — que e o bug
  // que a trava existe para fechar.
  assert.equal(proximoFoco(TOTAL, -1, false), 0);
  assert.equal(proximoFoco(TOTAL, -1, true), TOTAL - 1);
});

test("lista de um unico item fica presa nele", () => {
  // Tab e Shift+Tab dao na mesma parada; sem tratamento, os dois vazariam.
  assert.equal(proximoFoco(1, 0, false), 0);
  assert.equal(proximoFoco(1, 0, true), 0);
  assert.equal(proximoFoco(1, -1, false), 0);
});

test("lista de dois itens alterna sem escapar", () => {
  assert.equal(proximoFoco(2, 1, false), 0);
  assert.equal(proximoFoco(2, 0, true), 1);
  assert.equal(proximoFoco(2, 0, false), null);
  assert.equal(proximoFoco(2, 1, true), null);
});
