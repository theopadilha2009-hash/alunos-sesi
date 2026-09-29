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
 * O que continua fora, e é bom saber:
 *
 *   - um `+1` desenhado **sem** a classe `btn-endorsement-add` (markup
 *     diferente) não é visto — o alvo é a classe;
 *   - só os `.tsx` de `src/components/` (recursivo) são varridos: um `+1` numa
 *     `page` de `src/app/`, ou num `.js`/`.jsx`, passa ao largo;
 *   - um guard a mais de `JANELA` letras do botão falha o teste **mesmo estando
 *     certo** — de propósito, para quem escrever um ternário tão longo ajustar
 *     a constante em vez de o teste esconder o botão;
 *   - o guard só é procurado **antes** do botão: guard escrito depois falha o
 *     teste, de novo do lado barulhento;
 *   - um `habilidadePermitida(` que esteja ali por outro motivo (um comentário,
 *     ou o guard de outro botão colado no mesmo bloco) satisfaz a janela. A
 *     checagem do ramo fecha o caso mais grave — botão no `else`, que renderiza
 *     quando o guard falha — mas não essa vizinhança emprestada. Ela não existe
 *     hoje: há uma ocorrência de cada por arquivo;
 *   - a contagem de nível da checagem do ramo não entende string: um `)` ou um
 *     `:` dentro de um literal bagunça a conta. Não existe no código, e falha
 *     para o lado barulhento.
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

/** A classe do `+1`, sem casar nome maior que comece igual (`-addx`). */
const ALVO = /btn-endorsement-add(?![\w-])/g;

/**
 * O botão está no ramo do `:` do ternário do guard?
 *
 * Recebe o trecho que vai do guard até a classe e caminha contando parênteses,
 * colchetes e chaves. O `:` que interessa é o que aparece **com o aninhamento
 * de volta ao zero** — o do else do ternário. Os `:` que vivem dentro de algo
 * (`style={{...}}`, um `title` ternário, um `{...spread}`) estão em nível
 * maior e não contam.
 *
 * A checagem anterior proibia qualquer `:` no caminho, e por isso reprovava
 * botão **correto** com um `style` ou um `title` antes do `className` — o
 * código de hoje só passava por causa da ordem dos atributos. Contar o nível
 * desfaz esse acoplamento.
 *
 * Limite conhecido: a contagem não entende string, então um `)` ou `:` dentro
 * de um literal (`title={")"}`) bagunça o nível. Não existe no código, e o
 * modo de falha é o lado barulhento (reprova código certo).
 */
function estaNoRamoDoElse(trecho) {
  let nivel = 0;
  for (const caractere of trecho) {
    if (caractere === "(" || caractere === "[" || caractere === "{") nivel++;
    else if (caractere === ")" || caractere === "]" || caractere === "}") nivel--;
    else if (caractere === ":" && nivel === 0) return true;
  }
  return false;
}

test("todo +1 de competência tem o guard de habilidadePermitida à vista", () => {
  const arquivos = arquivosTsx(RAIZ);
  const comBotao = arquivos.filter((caminho) => ALVO.test(readFileSync(caminho, "utf8")));

  // Se isto cair para zero, a varredura perdeu o alvo — a classe mudou de nome e
  // o teste passaria sem olhar para nada. O filtro usa o MESMO matcher do laço,
  // de propósito: com um `.includes` cru, renomear a classe para algo que comece
  // igual (`btn-endorsement-add-x`) mantinha este canário verde enquanto o laço
  // não achava nada — varredura vazia com o teste passando. Foi a revisão do #62.
  assert.ok(
    comBotao.length >= 2,
    `esperava ao menos os dois pontos de +1 (perfil e modal do CRM), achei ${comBotao.length}`,
  );

  for (const caminho of comBotao) {
    const fonte = readFileSync(caminho, "utf8");
    // `matchAll` precisa do `/g`; o `ALVO` compartilhado tem, e o `lastIndex`
    // dele não é lido aqui porque `matchAll` clona o regex.
    for (const achado of fonte.matchAll(ALVO)) {
      const i = achado.index;
      const linha = fonte.slice(0, i).split("\n").length;
      const antes = fonte.slice(Math.max(0, i - JANELA), i);
      const posGuard = antes.lastIndexOf("habilidadePermitida(");

      assert.ok(
        posGuard !== -1,
        `${caminho}:${linha}: este +1 não tem o guard nas ${JANELA} letras ` +
          `anteriores — botão para competência que o servidor vai recusar é ` +
          `botão que sempre falha`,
      );

      assert.ok(
        !estaNoRamoDoElse(antes.slice(posGuard)),
        `${caminho}:${linha}: o +1 está no ramo do \`:\` do guard — renderiza ` +
          `exatamente quando o guard FALHA`,
      );
    }
  }
});
