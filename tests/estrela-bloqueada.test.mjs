import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * O cursor da estrela bloqueada, travado entre o JSX e o CSS.
 *
 * O bloqueio **permanente** (perfil pendente de aprovação, que a rota recusa
 * sempre) dividia o `:disabled` com o voto **em voo**, e o `cursor: progress`
 * escrito para a espera dizia "carregando" no caso que nunca passa. O conserto
 * foi marcar o envoltório com `data-bloqueada` e dar `cursor: not-allowed` a ele.
 *
 * São duas peças em dois arquivos, e nenhuma das duas é visível para o `tsc`:
 * uma remoção do atributo em **um** dos call sites, ou o rename do seletor no
 * CSS, passa por typecheck, testes e build sem falhar — e o cursor volta a
 * mentir em silêncio. É por isso que esta varredura existe, e não por gosto de
 * varredura.
 *
 * O que ela NÃO pega:
 *
 *   - um terceiro ponto de bloqueio desenhado com outro markup (a âncora é a
 *     classe `estrela-wrap`; um `+1`/estrela que não passe por ela escapa);
 *   - `className` montado em tempo de execução — o alvo é o literal, de
 *     propósito, porque um valor calculado não dá para conferir sem executar;
 *   - se o `not-allowed` é a escolha certa (é design), ou se o cursor de fato
 *     aparece no navegador (não há jsdom aqui).
 */

const RAIZ = fileURLToPath(new URL("../src/", import.meta.url));
const VITRINE_CSS = `${RAIZ}app/styles/vitrine.css`;

/**
 * A tag de abertura do envoltório, inteira. `[^>]*` basta: nenhum dos valores
 * dos atributos tem `>` dentro.
 */
const RE_WRAP = /<span\s[^>]*className="estrela-wrap"[^>]*>/g;

function arquivosTsx(dir, achados = []) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules") continue;
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) arquivosTsx(caminho, achados);
    else if (entrada.endsWith(".tsx")) achados.push(caminho);
  }
  return achados;
}

test("todo envoltório da estrela marca o bloqueio, e o CSS sabe pintá-lo", () => {
  const wraps = [];
  for (const caminho of arquivosTsx(RAIZ)) {
    const fonte = readFileSync(caminho, "utf8");
    for (const achado of fonte.matchAll(RE_WRAP)) {
      const linha = fonte.slice(0, achado.index).split("\n").length;
      wraps.push({ rel: caminho.replace(RAIZ, ""), linha, tag: achado[0] });
    }
  }

  // Se isto cair, a varredura perdeu o alvo — a classe mudou de nome, ou o
  // `className` deixou de ser literal, e o teste passaria sem olhar para nada.
  assert.ok(
    wraps.length >= 2,
    `esperava ao menos os dois envoltórios de estrela, achei ${wraps.length}`,
  );

  // Os dois envoltórios que existem são de bloqueio: o `estrela-wrap` nasceu no
  // PR #56 exatamente para o motivo do `disabled` poder aparecer (o Chrome não
  // emite evento de mouse em controle desabilitado). Um envoltório sem o
  // marcador é o cursor mentindo de novo.
  for (const { rel, linha, tag } of wraps) {
    assert.match(
      tag,
      /data-bloqueada/,
      `${rel}:${linha}: o envoltório da estrela não marca o bloqueio — sem ` +
        `\`data-bloqueada\`, o \`cursor: progress\` do :disabled volta a dizer ` +
        `"carregando" no bloqueio permanente`,
    );
  }

  // Comentário fora antes de ler as regras: o `split(",")` da lista de seletores
  // picaria a prosa — que tem vírgula — e o nome do seletor chegaria grudado no
  // texto. Mesma precaução do `soSeletores` em `classes-css.test.mjs`.
  const css = readFileSync(VITRINE_CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  // Lido como regra, não como texto solto: os dois seletores moram na **mesma**
  // declaração, então casar `seletor\s*{` perderia aquele que não abre o bloco.
  const regras = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((achado) => ({
    seletores: achado[1].split(",").map((s) => s.trim()),
    corpo: achado[2],
  }));
  const pinta = (alvo) =>
    regras.some(
      (r) => r.seletores.includes(alvo) && /cursor:\s*not-allowed/.test(r.corpo),
    );

  // O envoltório cobre os cantos da pílula (o botão tem `border-radius: 999px`,
  // e o hit-test dos cantos cai no envoltório).
  assert.ok(
    pinta(".estrela-wrap[data-bloqueada]"),
    "sumiu o `cursor: not-allowed` do envoltório bloqueado",
  );

  // E o botão cobre a face: quem está sob o ponteiro é ele, e o
  // `cursor: progress` do `.estrela:disabled` venceria o do envoltório.
  assert.ok(
    pinta(".estrela-wrap[data-bloqueada] .estrela:disabled"),
    "sumiu o seletor que alcança o botão — o `:disabled` dele vence o envoltório",
  );
});
