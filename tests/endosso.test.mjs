import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Guarda de varredura: TODO +1 de competência tem que passar pelo
 * `habilidadePermitida` — e o guard tem que estar **no botão**, não em qualquer
 * lugar do arquivo.
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
 *
 * A versão anterior contava por arquivo (`guards >= botoes`) e passava com o
 * guard em qualquer lugar — inclusive num trecho que não envolve botão nenhum.
 * Agora cada botão é conferido na sua vizinhança imediata.
 *
 * O que continua fora, e é bom saber: um `+1` desenhado **sem** a classe
 * `btn-endorsement-add` (markup diferente) não é visto — o alvo da varredura é
 * a classe —, e um guard que esteja a mais de `JANELA` letras do botão falha o
 * teste mesmo estando certo. O segundo caso é barulhento de propósito: quem
 * escrever um ternário tão longo ajusta a janela aqui, em vez de o teste passar
 * a esconder o botão.
 */

const RAIZ = fileURLToPath(new URL("../src/components/", import.meta.url));

/**
 * Quantas letras antes do botão o guard precisa estar.
 *
 * Medido nos dois pontos que existem: 133 (`PerfilInterativo`) e 145
 * (`ModalPerfilBreve`) — a folga é de mais de 3×, para caber um ternário maior
 * sem virar falso alarme.
 */
const JANELA = 500;

function arquivosTsx(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = `${dir}${entrada.name}`;
    if (entrada.isDirectory()) return arquivosTsx(`${caminho}/`);
    return entrada.name.endsWith(".tsx") ? [caminho] : [];
  });
}

test("todo +1 de competência tem o guard de habilidadePermitida à vista", () => {
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
    let i = -1;
    while ((i = fonte.indexOf("btn-endorsement-add", i + 1)) !== -1) {
      const linha = fonte.slice(0, i).split("\n").length;
      const antes = fonte.slice(Math.max(0, i - JANELA), i);

      assert.ok(
        antes.includes("habilidadePermitida("),
        `${caminho}:${linha}: este +1 não tem o guard nas ${JANELA} letras ` +
          `anteriores — botão para competência que o servidor vai recusar é ` +
          `botão que sempre falha`,
      );
    }
  }
});
