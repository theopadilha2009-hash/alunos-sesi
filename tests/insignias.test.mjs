import assert from "node:assert/strict";
import { test } from "node:test";
import { insigniasDe } from "../src/lib/insignias.ts";

const ACHADA = (lista, id) => lista.find((i) => i.id === id);
/** Os ids acesos, na ordem da escada. */
const ACESAS = (placar) => insigniasDe(placar).filter((i) => i.conquistada).map((i) => i.id);

test("aluno zerado ve as seis insignias, nenhuma conquistada", () => {
  const lista = insigniasDe({ estrelas: 0, habilidades_votos: {} });

  assert.equal(lista.length, 6);
  assert.ok(lista.every((i) => !i.conquistada));
  assert.ok(lista.every((i) => i.progresso.atual === 0));
});

test("a ordem da escada e fixa", () => {
  // Reordenar por conquista moveria a tela de baixo do aluno a cada estrela
  // nova, e ele perderia a referencia de onde cada caixa fica.
  const ids = insigniasDe({ estrelas: 15, habilidades_votos: { Python: 5 } }).map((i) => i.id);
  assert.deepEqual(ids, ["estreia", "endossado", "destaque", "polivalente", "referencia", "fenomeno"]);
});

test("cada limiar acende so a insignia dele", () => {
  const com = (estrelas, habilidades_votos = {}) => ACESAS({ estrelas, habilidades_votos });

  assert.deepEqual(com(0), []);
  assert.deepEqual(com(1), ["estreia"]);
  assert.deepEqual(com(5), ["estreia", "destaque"]);
  assert.deepEqual(com(15), ["estreia", "destaque", "fenomeno"]);

  // 3 votos em 3 habilidades: soma 3 (endossado) e 3 competencias distintas
  // (polivalente) — as duas de uma vez, e nao uma no lugar da outra.
  assert.deepEqual(com(0, { Python: 1, Robótica: 1, Mobile: 1 }), ["endossado", "polivalente"]);

  // 5 votos na MESMA habilidade e referencia, nao polivalente
  assert.deepEqual(com(0, { Python: 5 }), ["endossado", "referencia"]);

  // 1 voto em cada: soma 2, abaixo dos 3 do endossado, e 2 competencias, abaixo
  // das 3 do polivalente
  assert.deepEqual(com(0, { Python: 1, Mobile: 1 }), []);

  // 2 votos em 2 habilidades somam 4: endossado acende, polivalente nao — a
  // soma conta endossos, o polivalente conta competencias distintas.
  assert.deepEqual(com(0, { Python: 2, Mobile: 2 }), ["endossado"]);
});

test("progresso nunca passa do alvo", () => {
  // barra de progresso acima de 100% e bug visual, e o numero vaza para a tela
  const lista = insigniasDe({ estrelas: 100, habilidades_votos: { Python: 9 } });
  assert.deepEqual(ACHADA(lista, "estreia").progresso, { atual: 1, alvo: 1 });
  assert.deepEqual(ACHADA(lista, "fenomeno").progresso, { atual: 15, alvo: 15 });
  assert.deepEqual(ACHADA(lista, "referencia").progresso, { atual: 5, alvo: 5 });
});

test("conquistada e exatamente progresso cheio", () => {
  for (const estrelas of [0, 1, 4, 5, 14, 15]) {
    for (const i of insigniasDe({ estrelas, habilidades_votos: { Python: 3, Mobile: 5 } })) {
      assert.equal(i.conquistada, i.progresso.atual >= i.progresso.alvo, `${i.id} em ${estrelas}`);
    }
  }
});

test("contagem de voto suja nao conta", () => {
  // O cache vem de trigger, mas quem monta a tela nao pode cair por causa dele:
  // string, negativo, NaN e null nao sao voto.
  const lista = insigniasDe({
    estrelas: 0,
    habilidades_votos: { Python: "3", Mobile: -5, Web: NaN, IA: null, Robótica: 2 },
  });
  assert.equal(ACHADA(lista, "polivalente").conquistada, false);
  assert.equal(ACHADA(lista, "endossado").progresso.atual, 2);
});

test("entrada ausente ou invalida devolve a lista zerada, nao erro", () => {
  for (const placar of [null, undefined, {}, { estrelas: null }, { estrelas: "12" }]) {
    const lista = insigniasDe(placar);
    assert.equal(lista.length, 6, `placar ${JSON.stringify(placar)}`);
    assert.ok(lista.every((i) => !i.conquistada));
  }
});

test("estrela fracionaria desce para inteiro", () => {
  // 1.9 estrela nao existe; o piso evita acender a insignia de 5 com 4.5
  assert.deepEqual(ACESAS({ estrelas: 4.9 }), ["estreia"]);
});
