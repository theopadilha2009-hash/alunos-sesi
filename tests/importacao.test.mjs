import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { classeDoRecado, tomDaImportacao } from "../src/lib/importacao.ts";

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

/* ── A classe que o tom vira ────────────────────────────────────────────────
 *
 * O teste acima só garante que o tom está no vocabulário do módulo. Ele não vê
 * o que o componente FAZ com o valor — e era exatamente aí que estava o furo:
 * o `ImportarLista` montava `recado-${tom}`, o tom de sucesso é "sucesso", e a
 * família `recado-*` chama isso de `ok`. O CSS tem `recado-ok`, `recado-erro` e
 * `recado-atencao`; `recado-sucesso` não existe em arquivo nenhum. A importação
 * bem-sucedida na página `/adm` caía no `.recado` base, sem verde e sem fundo,
 * enquanto erro e atenção continuavam coloridos.
 *
 * Nenhum tipo pega isso: a classe é uma string montada em tempo de render. Quem
 * pega é a varredura — a mesma ideia do `endosso.test.mjs`.
 */

const VITRINE = fileURLToPath(new URL("../src/app/styles/vitrine.css", import.meta.url));
const CRM = fileURLToPath(new URL("../src/app/styles/crm.css", import.meta.url));
const IMPORTAR = fileURLToPath(
  new URL("../src/components/adm/ImportarLista.tsx", import.meta.url),
);

/** Nomes de classe realmente declarados no CSS (comentários fora, que citam nomes). */
function classesDeclaradas(css) {
  const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return new Set([...semComentario.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
}

const TONS = ["sucesso", "atencao", "erro"];

test("todo tom vira uma classe que existe nos dois CSS", () => {
  const vitrine = classesDeclaradas(readFileSync(VITRINE, "utf8"));
  const crm = classesDeclaradas(readFileSync(CRM, "utf8"));

  for (const tom of TONS) {
    assert.ok(
      vitrine.has(classeDoRecado(tom)),
      `o tom "${tom}" monta "${classeDoRecado(tom)}", que não existe em vitrine.css`,
    );
    assert.ok(
      crm.has(`alerta-${tom}`),
      `o tom "${tom}" monta "alerta-${tom}", que não existe em crm.css`,
    );
  }
});

/*
 * Esta varredura é só do lado `recado` de propósito. No CRM a classe é
 * `alerta-${tom}` e o mapeamento é 1:1 — o teste acima, que confere a classe
 * contra o CSS, já cobre um tom novo que aparecesse ali. Aqui não: a família
 * `recado-*` renomeia "sucesso" para `-ok`, então o mapeamento precisa morar
 * num lugar só, e o componente precisa passar por ele.
 */
test("ImportarLista monta a classe do recado pela função, não na mão", () => {
  const importar = readFileSync(IMPORTAR, "utf8");

  // Se isto cair, o alvo mudou de nome e a varredura estaria olhando para nada.
  assert.ok(
    importar.includes("recado"),
    "a varredura perdeu o alvo: `recado` sumiu do ImportarLista",
  );

  assert.ok(
    importar.includes("classeDoRecado("),
    "ImportarLista monta a classe do recado sem passar por `classeDoRecado`",
  );
  assert.ok(
    !importar.includes("`recado-${"),
    "ImportarLista voltou a montar a classe do recado na mão — é assim que o " +
      "`recado-sucesso` (que não existe em CSS nenhum) voltaria",
  );
});
