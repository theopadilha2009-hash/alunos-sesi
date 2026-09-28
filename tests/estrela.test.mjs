import assert from "node:assert/strict";
import { test } from "node:test";
import {
  lerRespostaEstrela,
  motivoParaNaoEstrelar,
} from "../src/lib/estrela.ts";

test("lerRespostaEstrela aceita o voto gravado", () => {
  assert.deepEqual(lerRespostaEstrela(200, { estrelas: 7, votado: true }), {
    ok: true,
    estrelas: 7,
    votado: true,
  });
});

test("lerRespostaEstrela aceita a remocao do voto", () => {
  assert.deepEqual(lerRespostaEstrela(200, { estrelas: 6, votado: false }), {
    ok: true,
    estrelas: 6,
    votado: false,
  });
});

test("lerRespostaEstrela devolve o motivo que o servidor deu", () => {
  // os tres casos reais da rota: 404 de perfil pendente, 429 de rate limit
  // e 400 de navegador sem cookie de visitante
  assert.deepEqual(lerRespostaEstrela(404, { erro: "Perfil não disponível." }), {
    ok: false,
    motivo: "Perfil não disponível.",
  });
  assert.deepEqual(
    lerRespostaEstrela(429, {
      erro: "Muitos votos em pouco tempo. Aguarde alguns instantes.",
    }),
    { ok: false, motivo: "Muitos votos em pouco tempo. Aguarde alguns instantes." },
  );
  assert.deepEqual(
    lerRespostaEstrela(400, { erro: "Sem identidade de visitante — recarregue a página." }),
    { ok: false, motivo: "Sem identidade de visitante — recarregue a página." },
  );
});

test("lerRespostaEstrela nao aceita 200 sem os campos", () => {
  // 200 com corpo vazio e resposta quebrada, nao voto gravado: aceitar isso
  // deixaria a tela mostrando um numero que ninguem confirmou
  assert.equal(lerRespostaEstrela(200, {}).ok, false);
  assert.equal(lerRespostaEstrela(200, null).ok, false);
  assert.equal(lerRespostaEstrela(200, undefined).ok, false);
  assert.equal(lerRespostaEstrela(200, { estrelas: "7", votado: true }).ok, false);
  assert.equal(lerRespostaEstrela(200, { estrelas: 7 }).ok, false);
  assert.equal(lerRespostaEstrela(200, { votado: true }).ok, false);
});

test("lerRespostaEstrela cai numa mensagem propria quando o servidor nao explica", () => {
  const r = lerRespostaEstrela(500, {});
  assert.equal(r.ok, false);
  assert.match(r.motivo, /não deu para votar/i);
  // erro que nao e string nao vira mensagem na tela
  assert.equal(lerRespostaEstrela(500, { erro: { detalhe: "x" } }).ok, false);
  assert.equal(lerRespostaEstrela(500, { erro: "" }).ok, false);
});

test("motivoParaNaoEstrelar barra o perfil pendente", () => {
  assert.equal(motivoParaNaoEstrelar({ aprovado: true }), null);
  assert.match(motivoParaNaoEstrelar({ aprovado: false }), /aprova/i);
});
