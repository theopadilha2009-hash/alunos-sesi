import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LISTA_HABILIDADES,
  MAX_CARACTERES_HABILIDADE,
  corHabilidade,
  extrairHabilidades,
  habilidadePermitida,
  normalizarNomeHabilidade,
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

// ── Competencia escrita pelo aluno ───────────────────────────────────────

test("normalizarNomeHabilidade colapsa espaco e apara as pontas", () => {
  assert.equal(normalizarNomeHabilidade("  Machine   Learning  "), "Machine Learning");
  assert.equal(normalizarNomeHabilidade("Javascript"), "Javascript");
});

test("normalizarNomeHabilidade devolve a forma canonica da lista", () => {
  // o digitado tem que virar o nome que o endosso alcanca
  assert.equal(normalizarNomeHabilidade("python"), "Python");
  assert.equal(normalizarNomeHabilidade("WEB FRONTEND"), "Web Frontend");
  assert.equal(normalizarNomeHabilidade("C++ & Embarcados"), "C++ & Embarcados");
  // abreviacao nao e a mesma competencia: "c++" continua nome livre, sem endosso
  assert.equal(normalizarNomeHabilidade("c++"), "c++");
  assert.equal(habilidadePermitida(normalizarNomeHabilidade("c++")), false);
});

test("normalizarNomeHabilidade recusa o que nao pode ser competencia", () => {
  assert.equal(normalizarNomeHabilidade(""), null);
  assert.equal(normalizarNomeHabilidade("   "), null);
  assert.equal(normalizarNomeHabilidade(null), null);
  assert.equal(normalizarNomeHabilidade(42), null);
  assert.equal(normalizarNomeHabilidade({}), null);
  assert.equal(normalizarNomeHabilidade("-hifen-na-frente"), null);
  assert.equal(normalizarNomeHabilidade("<script>alert(1)</script>"), null);
  assert.equal(normalizarNomeHabilidade("ops\u0000nulo"), null);
  assert.equal(normalizarNomeHabilidade("a".repeat(MAX_CARACTERES_HABILIDADE + 1)), null);
  // exatamente no teto ainda entra
  assert.equal(
    normalizarNomeHabilidade("a".repeat(MAX_CARACTERES_HABILIDADE))?.length,
    MAX_CARACTERES_HABILIDADE,
  );
});

test("todo nome da lista sobrevive a normalizacao", () => {
  // se um nome da lista deixasse de casar com o padrao de `normalizarNomeHabilidade`,
  // o perfil recusaria uma competencia que a propria casa oferece
  for (const h of LISTA_HABILIDADES) {
    assert.equal(
      normalizarNomeHabilidade(h.nome),
      h.nome,
      `"${h.nome}" deveria passar pela normalizacao`,
    );
  }
});

test("o endosso continua fechado no que o perfil passou a aceitar", () => {
  // a lista de sugestao e a allowlist de endosso sao coisas diferentes agora:
  // "Javascript" pode estar no perfil, mas nao recebe +1
  assert.equal(habilidadePermitida("Javascript"), false);
  assert.equal(normalizarNomeHabilidade("Javascript"), "Javascript");
});
