import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Classe usada no JSX que nenhum CSS do projeto define.
 *
 * Não é implicância com CSS morto do outro lado (regra que ninguém usa): é o
 * contrário, e é a direção que chega na tela. `className="textarea-bio"` no
 * modal do mural era exatamente isto — a classe nunca existiu em CSS nenhum, e
 * o campo caiu no estilo default do navegador: **fundo branco com o texto preto
 * no meio de um modal escuro**. O bug não apareceu em teste, em tsc nem em
 * revisão de diff; apareceu na tela do aluno.
 *
 * Nenhum tipo pega: `className` é string. Quem pega é a varredura — a mesma
 * ideia do `erro-interno.test.mjs`, do `endosso.test.mjs` e da varredura de
 * classe em `importacao.test.mjs`.
 *
 * A lista abaixo é a dívida conhecida, medida em 2026-09-29 (32 classes em 760
 * usadas). Cada item tem o motivo, e o motivo decide a prioridade:
 *
 *   - `INLINE`     — o visual vem de `style={{...}}` no mesmo elemento; a classe
 *                    não faz falta hoje (os stickers, o aviso de senha).
 *   - `BASE`       — acompanha uma classe viva no mesmo `className` (`.botao`,
 *                    `.badge-rede-icone-wrap`), que já dá o estilo; a órfã só
 *                    não diferencia nada (o `botao-secundario` sai igual ao
 *                    primário).
 *   - `TEXTO`      — elemento de texto dentro de um bloco estilizado; herda
 *                    tipografia e não tem layout próprio.
 *   - `CAIXA`      — container sem estilo com filhos estilizados. **É o grupo
 *                    que pede decisão de design**, não conserto mecânico.
 *   - `SEM_ESTILO` — controle interativo sem classe base nenhuma: recebe o
 *                    visual default do navegador. É o único grupo que é defeito
 *                    de tela hoje, e é a mesma família do `textarea-bio`.
 *
 * Nenhuma destas 32 foi confirmada quebrada em tela, exceto o `btn-ver-autor` —
 * e ele por leitura, não por medição: um `<button>` sem classe viva nenhuma
 * recebe o estilo do navegador (fundo claro, borda, fonte do sistema) dentro de
 * um card escuro do CRM. O conserto é de design (que classe da casa ele usa),
 * e está em `.context/memoria/pendencias-de-decisao.md`.
 *
 * O que esta varredura NÃO pega, e é bom saber:
 *
 *   - classe montada em tempo de execução — `className={cond ? "a" : "b"}`,
 *     `clsx(...)`, e **qualquer** template com `${}`, que descarta a linha
 *     inteira: inclusive os tokens estáticos ao lado da interpolação, como o
 *     `cmd-item` de `` className={`cmd-item ${x}`} ``;
 *   - CSS fora de `src/`;
 *   - o caso oposto — regra CSS que nenhum `className` usa. É lixo do outro
 *     lado, sem efeito na tela;
 *   - `style={{...}}` inline, que funciona mesmo quando a classe ao lado é
 *     decorativa.
 *
 * As formas que **são** cobertas: aspas duplas e simples, `className={"..."}`
 * com espaço ou quebra antes das aspas, e template sem interpolação.
 *
 * Quando o CSS de uma destas for escrito, o teste **falha** de propósito até a
 * linha sair desta lista — a lista não pode virar cemitério.
 */

const SRC = fileURLToPath(new URL("../src", import.meta.url));

const INLINE = "visual vem de style inline";
const BASE = "acompanha classe viva no mesmo className";
const TEXTO = "texto que herda tipografia do pai";
const CAIXA = "container sem estilo com filhos estilizados";
const SEM_ESTILO = "controle interativo sem classe base: visual do navegador";

/** As 32 órfãs medidas em 2026-09-29, com o motivo de cada uma. */
const SEM_CSS = {
  "adm-header-info": CAIXA,
  "aviso-senha-invalida": INLINE,
  "badge-rede-texto": TEXTO,
  "bloco-cabecalho-tabela": CAIXA,
  "botao-secundario": BASE,
  "breve-secao": CAIXA,
  "btn-confirmar-submissao": BASE,
  "btn-imprimir-curriculo": BASE,
  "busca-campo": INLINE,
  "campo-dica": TEXTO,
  "cmd-label": TEXTO,
  "cracha-habilidades": CAIXA,
  "criacao-desc": TEXTO,
  "criacao-titulo": TEXTO,
  "curriculo-avatar-col": CAIXA,
  "hab-nome": TEXTO,
  "ig-icone": BASE,
  "mural-topo-conteudo": CAIXA,
  "nfc-dot": TEXTO,
  "nfc-escola-tag": TEXTO,
  "perfil-projetos-secao": CAIXA,
  "perfil-titulos": CAIXA,
  "selo-verde-textos": CAIXA,
  "sticker-flutuante-breve": INLINE,
  "sticker-flutuante-hero": INLINE,
  "sticker-flutuante-perfil": INLINE,
  "sticker-flutuante-proj": INLINE,
  "top-projetos-titulo-wrap": CAIXA,
  "vazio-suave": CAIXA,
};

function arquivos(dir, sufixos, achados = []) {
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules") continue;
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) arquivos(caminho, sufixos, achados);
    else if (sufixos.some((s) => entrada.endsWith(s))) achados.push(caminho);
  }
  return achados;
}

/**
 * Os formatos de `className` que dão para ler sem executar nada.
 *
 * `className={cond ? "a" : "b"}` e template com `${}` ficam de fora — o valor
 * não existe em tempo de leitura, e chutar seria pior que a lacuna.
 */
const RE_CLASS =
  /className=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\})/g;

/** Nomes de classe como seletor em CSS. */
const RE_CSS = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;

/**
 * CSS reduzido ao que pode ser seletor, antes de procurar as classes.
 *
 * Sem isto o regex super-casa `.x` que não é seletor nenhum e **inventa uma
 * classe declarada** — o pior erro possível aqui, porque uma declarada falsa
 * esconde uma órfã real de mesmo nome. Os três casos: `url(icone.svg)` declara
 * `svg`, `content: ".icone"` declara `icone`, `var(--cor.texto)` declara
 * `texto`. Nenhum existe no CSS de hoje (conferido), e nenhum deve voltar.
 *
 * A ordem importa: comentário primeiro (um `url(...)` dentro de comentário),
 * depois strings (que podem conter `url(`), depois as funções.
 */
function soSeletores(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"[^"]*"|'[^']*'/g, "")
    .replace(/url\([^)]*\)/g, "")
    .replace(/var\([^)]*\)/g, "");
}

test("toda classe usada no JSX tem CSS, ou está na lista de dívida conhecida", () => {
  const usadas = new Set();
  // Só `.tsx`: `className` é JSX. Medido — nenhum arquivo `.ts` do projeto tem
  // `className`, e varrer os dois não mudava um único token.
  for (const caminho of arquivos(SRC, [".tsx"])) {
    const texto = readFileSync(caminho, "utf8");
    for (const achado of texto.matchAll(RE_CLASS)) {
      const bruto =
        achado[1] ?? achado[2] ?? achado[3] ?? achado[4] ?? achado[5] ?? "";
      // A linha inteira cai, inclusive os tokens estáticos ao lado do `${}`:
      // `className={`cmd-item ${x}`}` perde o `cmd-item` também. Ler a parte
      // estática exigiria interpretar a expressão — o que este teste não faz.
      if (bruto.includes("${")) continue;
      for (const token of bruto.split(/\s+/).filter(Boolean)) usadas.add(token);
    }
  }

  const declaradas = new Set();
  for (const caminho of arquivos(SRC, [".css"])) {
    for (const achado of soSeletores(readFileSync(caminho, "utf8")).matchAll(RE_CSS)) {
      declaradas.add(achado[1]);
    }
  }

  // Se isto cair, a varredura está olhando para o lugar errado.
  assert.ok(
    usadas.size > 100 && declaradas.size > 100,
    `a varredura perdeu o alvo: ${usadas.size} classes usadas, ${declaradas.size} declaradas`,
  );

  const orfas = [...usadas].filter((classe) => !declaradas.has(classe)).sort();
  const conhecidas = Object.keys(SEM_CSS).sort();

  // Classe órfã que ninguém classificou: é assim que o `textarea-bio` nasceu.
  const novas = orfas.filter((classe) => !SEM_CSS[classe]);
  assert.deepEqual(
    novas,
    [],
    "classe usada no JSX sem nenhum CSS — dê estilo a ela ou remova do className",
  );

  // Classe que ganhou CSS e continuou na lista: a lista apodrece em silêncio e
  // passa a esconder uma órfã nova que reaproveite o mesmo nome.
  const resolvidas = conhecidas.filter((classe) => !orfas.includes(classe));
  assert.deepEqual(
    resolvidas,
    [],
    "estas já têm CSS — tire-as de SEM_CSS em tests/classes-css.test.mjs",
  );

  assert.deepEqual(
    orfas,
    conhecidas,
    `a lista e a medição divergiram (${orfas.length} medidas, ${conhecidas.length} na lista)`,
  );
});
