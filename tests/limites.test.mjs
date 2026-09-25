import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIMITES_STICKERS,
  MAX_DATA_URL_IMAGEM,
  MAX_MIDIAS,
  MAX_PROJETOS,
  conferirTamanhoDaImagem,
  descreverDescartes,
  tetoDoCampo,
} from "../src/lib/limites.ts";

const PREFIXO = "data:image/png;base64,";

/**
 * Data URL de uma imagem com `bytesDeArquivo` bytes. O base64 ocupa 4/3 do
 * binário; o prefixo entra na conta de propósito, porque é `url.length` que o
 * teto mede — tanto aqui quanto no servidor.
 */
function dataUrl(bytesDeArquivo) {
  return PREFIXO + "A".repeat(Math.ceil((bytesDeArquivo * 4) / 3));
}

// ── descreverDescartes ──────────────────────────────────────────────────────

test("descreverDescartes nao avisa nada quando nada foi descartado", () => {
  assert.equal(descreverDescartes([]), null);
});

test("descreverDescartes agrupa por motivo e campo, com a contagem", () => {
  const msg = descreverDescartes([
    { motivo: "grande-demais", campo: "midias" },
    { motivo: "grande-demais", campo: "midias" },
    { motivo: "sem-titulo", campo: "projetos" },
  ]);

  assert.match(msg, /2× imagem: arquivo grande demais \(2 MB por imagem\)/);
  assert.match(msg, /1× projeto: projeto sem título/);
  assert.match(msg, new RegExp(`O perfil aceita ${MAX_MIDIAS} imagens, ${MAX_PROJETOS} projetos`));
});

test("descreverDescartes nao junta o mesmo motivo em campos diferentes", () => {
  const msg = descreverDescartes([
    { motivo: "acima-do-limite", campo: "midias" },
    { motivo: "acima-do-limite", campo: "stickers" },
  ]);

  assert.match(msg, /1× imagem: acima do limite do perfil/);
  assert.match(msg, /1× sticker: acima do limite do perfil/);
});

test("descreverDescartes nao confunde capa perdida com projeto perdido", () => {
  // O projeto ENTRA sem a capa. Dizer "1× projeto" seria mentir para o aluno,
  // que iria procurar um projeto que esta la.
  const msg = descreverDescartes([{ motivo: "grande-demais", campo: "projetos" }]);
  assert.match(msg, /1× capa de projeto: arquivo grande demais \(2 MB por imagem\)/);
  assert.doesNotMatch(msg, /1× projeto:/);
});

test("descreverDescartes chama o link de projeto pelo nome", () => {
  const msg = descreverDescartes([{ motivo: "link-invalido", campo: "projetos" }]);
  assert.match(msg, /1× link de projeto: endereço inválido/);
});

test("descreverDescartes usa o teto do campo certo em grande-demais", () => {
  const msg = descreverDescartes([{ motivo: "grande-demais", campo: "stickers" }]);
  assert.match(msg, /1× sticker: arquivo grande demais \(512 KB por sticker\)/);
});

// ── tetoDoCampo ─────────────────────────────────────────────────────────────

test("tetoDoCampo da o teto menor para sticker", () => {
  assert.equal(tetoDoCampo("midias"), MAX_DATA_URL_IMAGEM);
  assert.equal(tetoDoCampo("projetos"), MAX_DATA_URL_IMAGEM);
  assert.equal(tetoDoCampo("stickers"), LIMITES_STICKERS.maxDataUrlBytes);
});

// ── conferirTamanhoDaImagem ─────────────────────────────────────────────────

test("conferirTamanhoDaImagem ignora o que nao e data URL de imagem", () => {
  assert.equal(conferirTamanhoDaImagem("https://exemplo.com/foto.png", "midias"), null);
  assert.equal(conferirTamanhoDaImagem("", "midias"), null);
  // data URL gigante, mas que nao e de imagem: quem barra e o servidor, nao o atalho do cliente
  assert.equal(conferirTamanhoDaImagem(`data:text/html;base64,${"A".repeat(9e6)}`, "midias"), null);
});

test("conferirTamanhoDaImagem aceita data URL dentro do teto", () => {
  // Um caractere abaixo do teto: o limite e sobre `url.length`, nao sobre o
  // tamanho do arquivo, entao a string e montada na mao aqui.
  const cabe = PREFIXO + "A".repeat(MAX_DATA_URL_IMAGEM - PREFIXO.length - 1);
  assert.equal(cabe.length, MAX_DATA_URL_IMAGEM - 1);
  assert.equal(conferirTamanhoDaImagem(cabe, "midias"), null);
});

test("conferirTamanhoDaImagem explica o arquivo grande demais", () => {
  const msg = conferirTamanhoDaImagem(dataUrl(5 * 1024 * 1024), "midias");
  assert.match(msg, /^Essa imagem tem cerca de /);
  assert.match(msg, /e o perfil aceita até 1,5 MB\. Escolha um arquivo menor\.$/);
});

test("conferirTamanhoDaImagem usa o teto menor no sticker", () => {
  const kb500 = dataUrl(500 * 1024);
  assert.equal(conferirTamanhoDaImagem(kb500, "midias"), null);

  const msg = conferirTamanhoDaImagem(kb500, "stickers");
  assert.match(msg, /^Essa sticker tem cerca de 5\d\d KB/);
  assert.match(msg, /até 384 KB/);
});

test("tamanho e teto nunca imprimem o mesmo numero", () => {
  // Passa do teto por um unico caractere: o caso em que o arredondamento comum
  // virava "tem cerca de 1,5 MB ... aceita até 1,5 MB".
  for (const campo of ["midias", "projetos", "stickers"]) {
    const msg = conferirTamanhoDaImagem(dataUrl(tetoDoCampo(campo)), campo);
    const [, tamanho, teto] = msg.match(/cerca de ([\d,]+ [KM]B).+até ([\d,]+ [KM]B)/);
    assert.notEqual(tamanho, teto, `campo ${campo}: "${tamanho}" nos dois lados`);
  }
});
