import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * O sticker do cartão público tem que cair ONDE o aluno o posicionou no Estúdio.
 *
 * O defeito (corrigido em 15/10/2026) era invisível para `tsc`, para CI e para
 * revisão de diff: a página pública escrevia `transform: rotate(...)` inline, e o
 * `transform` inline **substitui** o do CSS em vez de somar. A `.nfc-sticker-item`
 * tinha `transform: translate(-50%, -50%)` justamente para centrar o elemento no
 * ponto (x%, y%) — com o inline sobrescrevendo, o CANTO do sticker caía no ponto
 * e ele aparecia deslocado meia-largura para baixo e para a direita. O Estúdio
 * (`StickerCanvas`) sempre posou certo porque escreve o par inteiro inline:
 * `translate(-50%, -50%) rotate(...)`.
 *
 * A varredura prende a invariante nas duas pontas: em toda `transform` que gira,
 * o par de centralização tem que estar junto. É o mesmo padrão de guarda do
 * `erro-interno.test.mjs` e do `estrela-bloqueada.test.mjs` — não existe tipo que
 * pegue isso, porque `style` é objeto solto.
 */

const RAIZ = new URL("../", import.meta.url);
const ler = (rel) => readFileSync(fileURLToPath(new URL(rel, RAIZ)), "utf8");

/** Toda `transform: \`...\`` (template) do arquivo, sem capturar a indentação. */
const RE_TRANSFORM = /transform:\s*`([^`]*)`/g;

function transforms(texto) {
  return [...texto.matchAll(RE_TRANSFORM)].map((m) => m[1]);
}

test("toda rotação de sticker no cartão público vem acompanhada do translate de centralização", () => {
  const pagina = ler("src/app/u/[slug]/page.tsx");
  const queGiram = transforms(pagina).filter((t) => t.includes("rotate("));

  // Se isto cair, a varredura perdeu o alvo: a página deveria ter os dois
  // stickers (banner e projeto) girando.
  assert.ok(
    queGiram.length >= 2,
    `esperava ao menos 2 transforms com rotate na página pública, achei ${queGiram.length}`,
  );

  for (const t of queGiram) {
    assert.ok(
      t.includes("translate(-50%, -50%)"),
      `transform rotacionado sem centralização no cartão público: \`${t}\` — ` +
        `o inline sobrescreve o CSS e o sticker cai com o canto no ponto escolhido`,
    );
  }
});

test("o Estúdio usa o mesmo par — a página pública espelha o que o aluno vê", () => {
  const estudio = ler("src/components/crm/StickerCanvas.tsx");
  const queGiram = transforms(estudio).filter((t) => t.includes("rotate("));

  assert.ok(
    queGiram.length >= 2,
    `esperava ao menos 2 transforms com rotate no Estúdio, achei ${queGiram.length}`,
  );

  for (const t of queGiram) {
    assert.ok(
      t.includes("translate(-50%, -50%)"),
      `o Estúdio deixou de centralizar: \`${t}\``,
    );
  }
});
