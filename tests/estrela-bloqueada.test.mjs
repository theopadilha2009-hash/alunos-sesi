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
 * São duas peças em arquivos diferentes, e nenhuma é visível para o `tsc`: o
 * atributo sai de **um** dos call sites, ou o seletor é renomeado, ou alguém
 * redeclara o `cursor` num CSS importado depois — e o cursor volta a mentir, com
 * typecheck, testes e build verdes. É por isso que esta varredura existe.
 *
 * Três decisões que a fazem pegar o que a primeira versão deixava passar, e que
 * são fáceis de desfazer sem perceber:
 *
 *   1. O JSX confere o **vínculo**, não a presença: a asserção é a expressão
 *      `data-bloqueada={impedimento ? "" : undefined}`, não a substring
 *      `data-bloqueada`. Com a substring, ligar o atributo ao flag errado
 *      (`ocupado`, o voto em voo) ou escrevê-lo incondicional passava verde — e a
 *      mentira só se invertia de lado.
 *   2. O CSS é lido em **todos** os arquivos de `src/`, não só no `vitrine.css`:
 *      `globals.css` importa `vitrine-moderno`, `crm`, `adm` e `print` **depois**,
 *      então uma regra de mesmo peso lá vence, e a varredura de um arquivo só nem
 *      abriria o arquivo para ver.
 *   3. Nenhum seletor que alcance o wrap bloqueado pode declarar `cursor` que não
 *      seja `not-allowed` — é o override, não a ausência, que quebra.
 *
 * O que ela NÃO pega:
 *
 *   - um bloqueio desenhado sem a classe `estrela-wrap` (a âncora é ela), e um
 *     `className` calculado, que não dá para conferir sem executar;
 *   - o vínculo por **semântica**: a expressão exata é exigida, então uma forma
 *     diferente que signifique o mesmo reprova — do lado barulhento, de
 *     propósito, como o `JANELA` do `endosso.test.mjs`;
 *   - regra dentro de `@media`: o leitor de regras não desce em bloco aninhado,
 *     então um `cursor` redefinido lá dentro escapa (hoje não existe);
 *   - **quem vence a cascata**: isto confere a **forma** dos seletores, não
 *     simula o motor. Um `cursor` declarado por um seletor equivalente que não
 *     traga `.estrela-wrap[data-bloqueada]` naquela ordem exata
 *     (`[data-bloqueada].estrela-wrap …`) escapa — não existe hoje. O
 *     `!important`, que é o mecanismo real de override, esse é **recusado**: se
 *     nenhuma asserção daqui saberia prever quem vence, o teste não finge que
 *     sabe;
 *   - se o `not-allowed` é a escolha certa (é design), e se o cursor de fato
 *     aparece no navegador — não há jsdom aqui.
 *
 * Todo `estrela-wrap` do repo é de bloqueio hoje (é para isso que o envoltório
 * nasceu, no PR #56): um envoltório novo que **não** fosse de bloqueio seria
 * forçado a carregar o marcador por esta varredura. Se isso acontecer, a âncora
 * precisa mudar — e não é o caso hoje.
 */

const RAIZ = fileURLToPath(new URL("../src/", import.meta.url));

/**
 * A tag de abertura do envoltório, inteira. `[^>]*` basta: nenhum dos valores
 * dos atributos tem `>` dentro.
 */
const RE_WRAP = /<span\s[^>]*className="estrela-wrap"[^>]*>/g;

/** A expressão canônica: o marcador tem que estar ligado ao `impedimento`. */
const RE_VINCULO = /data-bloqueada=\{impedimento \? "" : undefined\}/;

/** O seletor do envoltório; quem o contém por prefixo alcança o elemento. */
const ALVO = ".estrela-wrap[data-bloqueada]";
const NO_BOTAO = `${ALVO} .estrela:disabled`;

/**
 * Um seletor que alcança o wrap bloqueado **e** a estrela dentro dele (ou o
 * próprio wrap). Sem esta estreiteza, um `cursor` legítimo noutro filho —
 * `.estrela-wrap[data-bloqueada] .selo { cursor: help }` — seria reprovado.
 */
function alcancaOMarcado(seletor) {
  const i = seletor.indexOf(ALVO);
  if (i === -1) return false;
  const resto = seletor.slice(i + ALVO.length);
  return resto === "" || /\.estrela(?![\w-])/.test(resto);
}

function arquivos(dir, sufixo, achados = []) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules") continue;
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) arquivos(caminho, sufixo, achados);
    else if (entrada.endsWith(sufixo)) achados.push(caminho);
  }
  return achados;
}

/**
 * As regras de um CSS. O comentário sai antes: a prosa tem vírgula, e o
 * `split(",")` da lista de seletores a picaria, colando o texto no nome.
 */
function regrasDe(css) {
  return [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)].map(
    (achado) => ({
      seletores: achado[1].split(",").map((s) => s.trim()),
      corpo: achado[2],
    }),
  );
}

test("todo envoltório da estrela marca o bloqueio, e nenhum CSS desmente o cursor", () => {
  const wraps = [];
  for (const caminho of arquivos(RAIZ, ".tsx")) {
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

  for (const { rel, linha, tag } of wraps) {
    assert.match(
      tag,
      RE_VINCULO,
      `${rel}:${linha}: o \`data-bloqueada\` tem que estar ligado ao ` +
        `\`impedimento\` — e com esta forma exata. Solto, ou ligado a outro ` +
        `flag (\`ocupado\`, o voto em voo), o cursor só troca de mentira de lado`,
    );
  }

  const conflitos = [];
  const importantes = [];
  let definiuWrap = false;
  let definiuBotao = false;

  for (const caminho of arquivos(RAIZ, ".css")) {
    const rel = caminho.replace(RAIZ, "");
    for (const regra of regrasDe(readFileSync(caminho, "utf8"))) {
      if (!/cursor\s*:/.test(regra.corpo)) continue;
      for (const seletor of regra.seletores) {
        if (!alcancaOMarcado(seletor)) continue;
        // Um seletor que alcança a estrela bloqueada e mexe no cursor: só pode
        // ser `not-allowed`. Qualquer outro aqui vence por ordem de import.
        if (!/cursor:\s*not-allowed/.test(regra.corpo)) {
          conflitos.push(`${rel} \`${seletor}\` → ${regra.corpo.trim().split("\n")[0]}`);
        }
        if (seletor === ALVO) definiuWrap = true;
        if (seletor === NO_BOTAO) definiuBotao = true;
      }

      // `!important` na família da estrela, mesmo na regra-base: ele vence a
      // especificidade, e esta varredura confere **forma de seletor**, não
      // cascata — quem escrever um `cursor: … !important` que alcance a estrela
      // derrota o `not-allowed` sem que nenhuma asserção daqui saiba prever.
      // Não existe nenhum hoje (conferido); quem precisar de um, que mude este
      // teste de propósito, com o motivo escrito.
      if (/!important/.test(regra.corpo) && regra.seletores.some((s) => /estrela/.test(s))) {
        importantes.push(`${rel} \`${regra.seletores.join(", ")}\` → ${regra.corpo.trim().split("\n")[0]}`);
      }
    }
  }

  assert.deepEqual(
    conflitos,
    [],
    "regra de `cursor` alcançando a estrela bloqueada sem ser `not-allowed`",
  );

  assert.deepEqual(
    importantes,
    [],
    "`!important` num `cursor` da família da estrela: ele vence a cascata e esta " +
      "varredura não simula cascata — tire o `!important` ou mude o teste de propósito",
  );

  // O envoltório cobre os cantos da pílula: o botão tem `border-radius: 999px`,
  // e o hit-test dos cantos cai no envoltório.
  assert.ok(
    definiuWrap,
    `sumiu o \`cursor: not-allowed\` do \`${ALVO}\` — os cantos da pílula voltam a mentir`,
  );

  // E o botão cobre a face: quem está sob o ponteiro é ele, e o
  // `cursor: progress` do `.estrela:disabled` venceria o do envoltório.
  assert.ok(
    definiuBotao,
    `sumiu o seletor \`${NO_BOTAO}\` — o \`:disabled\` dele vence o envoltório`,
  );
});
