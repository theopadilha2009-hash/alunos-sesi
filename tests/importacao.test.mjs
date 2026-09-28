import assert from "node:assert/strict";
import { test } from "node:test";
import { tomDaImportacao } from "../src/lib/importacao.ts";

/**
 * O `ok: boolean` do `Estado` não dá conta do caso mais comum da importação:
 * colar a planilha da turma uma segunda vez, quando está tudo lá. Isso é
 * sucesso neutro — nada mudou e nada está errado —, mas o booleano só tinha
 * dois valores, então caía em "erro" e o professor recebia um banner vermelho
 * dizendo "12 já estavam completos". O tom é o terceiro valor.
 */
test("importação que criou ou completou algo é sucesso", () => {
  assert.equal(tomDaImportacao({ criados: 3, atualizados: 0, erros: 0 }), "sucesso");
  assert.equal(tomDaImportacao({ criados: 0, atualizados: 2, erros: 0 }), "sucesso");
  assert.equal(tomDaImportacao({ criados: 1, atualizados: 1, erros: 0 }), "sucesso");
});

test("nada a fazer é atenção, não erro", () => {
  // O caso do professor que reimporta para conferir: tudo já estava completo.
  assert.equal(tomDaImportacao({ criados: 0, atualizados: 0, erros: 0 }), "atencao");
});

test("nada mudou E com avisos ainda é erro", () => {
  // Nada entrou e há linha recusada: aí sim a importação falhou de verdade.
  assert.equal(tomDaImportacao({ criados: 0, atualizados: 0, erros: 4 }), "erro");
});

test("importou, mas com avisos, é atenção", () => {
  // Entrou gente, e alguma linha foi recusada. Verde puro esconderia o aviso.
  assert.equal(tomDaImportacao({ criados: 5, atualizados: 0, erros: 1 }), "atencao");
  assert.equal(tomDaImportacao({ criados: 0, atualizados: 1, erros: 2 }), "atencao");
});

test("nunca devolve um tom que o CSS não conhece", () => {
  const tons = new Set(["sucesso", "atencao", "erro"]);
  for (const criados of [0, 1, 7]) {
    for (const atualizados of [0, 1, 7]) {
      for (const erros of [0, 1, 7]) {
        assert.ok(
          tons.has(tomDaImportacao({ criados, atualizados, erros })),
          `tom fora da lista para ${criados}/${atualizados}/${erros}`,
        );
      }
    }
  }
});
