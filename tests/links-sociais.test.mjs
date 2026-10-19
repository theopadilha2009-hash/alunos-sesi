import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizarInstagram, processarLinksSociais } from "../src/lib/links.ts";

test("normalizarInstagram aceita @, link inteiro e handle cru", () => {
  assert.equal(normalizarInstagram("@joao.silva"), "@joao.silva");
  assert.equal(normalizarInstagram("https://www.instagram.com/joao.silva/"), "@joao.silva");
  assert.equal(normalizarInstagram("instagram.com/joao.silva?hl=pt-br"), "@joao.silva");
  assert.equal(normalizarInstagram(""), null);
});

test("normalizarInstagram recusa o que não é handle", () => {
  assert.equal(normalizarInstagram("joão silva"), null);
  assert.equal(normalizarInstagram("meu site http://x.com"), null);
  assert.equal(normalizarInstagram("a".repeat(31)), null);
});

test("processarLinksSociais devolve ERRO para GitHub preenchido e inválido", () => {
  // Regressão do bug: antes o handle inválido virava null, o update gravava
  // null por cima do que já estava salvo e a tela dizia "atualizado".
  const r = processarLinksSociais("", "joao_silva", "");
  assert.equal(r.links, null);
  assert.match(r.erro, /GitHub/);
});

test("processarLinksSociais devolve ERRO para LinkedIn inválido", () => {
  const r = processarLinksSociais("linkedin.com/in/joão silva", "", "");
  assert.equal(r.links, null);
  assert.match(r.erro, /LinkedIn/);
});

test("processarLinksSociais devolve ERRO para Instagram inválido", () => {
  const r = processarLinksSociais("", "", "joão silva!");
  assert.equal(r.links, null);
  assert.match(r.erro, /Instagram/);
});

test("processarLinksSociais aceita campo vazio como remoção", () => {
  const r = processarLinksSociais("", "", "");
  assert.equal(r.erro, null);
  assert.deepEqual(r.links, { linkedin: null, github: null, instagram: null });
});

test("processarLinksSociais normaliza as três formas válidas", () => {
  const r = processarLinksSociais(
    "linkedin.com/in/joao-silva",
    "https://github.com/joao-silva",
    "@joao.silva",
  );
  assert.equal(r.erro, null);
  assert.deepEqual(r.links, {
    linkedin: "https://www.linkedin.com/in/joao-silva",
    github: "joao-silva",
    instagram: "@joao.silva",
  });
});

test("processarLinksSociais aceita handle com _ no GitHub de terceiros? — não, recusa", () => {
  // O underscore NÃO é permitido no GitHub (é o caso mais comum de aluno errar).
  const r = processarLinksSociais("", "meu_perfil", "");
  assert.equal(r.links, null);
  assert.match(r.erro, /GitHub/);
});
