import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Guarda de varredura: TODO +1 de competência tem que passar pelo
 * `habilidadePermitida`.
 *
 * A regressão que este teste tranca já aconteceu. Quando a competência virou
 * texto livre (PR #40), a allowlist de endosso continuou valendo no servidor —
 * `apoiarHabilidadeAction` recusa o que não está na lista — mas só o perfil
 * público ganhou o guard na tela. O modal do CRM ficou desenhando um botão que
 * respondia "Competência não reconhecida" sempre que a competência tinha sido
 * escrita à mão.
 *
 * É varredura de fonte, e não teste de comportamento, porque o que se quer
 * saber é justamente "existe algum ponto de render que esqueceu o guard" — a
 * pergunta que nenhum teste de unidade do `habilidadePermitida` responde.
 */

const RAIZ = fileURLToPath(new URL("../src/components/", import.meta.url));

function arquivosTsx(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = `${dir}${entrada.name}`;
    if (entrada.isDirectory()) return arquivosTsx(`${caminho}/`);
    return entrada.name.endsWith(".tsx") ? [caminho] : [];
  });
}

test("todo +1 de competência passa pelo guard de habilidadePermitida", () => {
  const arquivos = arquivosTsx(RAIZ);
  const comBotao = arquivos.filter((caminho) =>
    readFileSync(caminho, "utf8").includes("btn-endorsement-add"),
  );

  // Se isto cair para zero, a varredura perdeu o alvo — a classe mudou de nome e
  // o teste passaria sem olhar para nada.
  assert.ok(
    comBotao.length >= 2,
    `esperava ao menos os dois pontos de +1 (perfil e modal do CRM), achei ${comBotao.length}`,
  );

  for (const caminho of comBotao) {
    const fonte = readFileSync(caminho, "utf8");
    const botoes = fonte.split("btn-endorsement-add").length - 1;
    const guards = fonte.split("habilidadePermitida(").length - 1;

    assert.ok(
      guards >= botoes,
      `${caminho}: ${botoes} botão(ões) +1 para ${guards} guard(s) — o +1 fora da ` +
        `allowlist falha sempre e parece botão quebrado`,
    );
  }
});
