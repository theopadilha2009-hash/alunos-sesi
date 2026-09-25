import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIMITES_STICKERS,
  compararTempoConstante,
  resetarRateLimit,
  sanitizarFoto,
  sanitizarHabilidades,
  sanitizarMidias,
  sanitizarProjetos,
  sanitizarStickers,
  sanitizarTexto,
  urlImagemSegura,
  urlSegura,
  verificarRateLimit,
} from "../src/lib/seguranca.ts";
import { MAX_DATA_URL_FOTO, MAX_DATA_URL_IMAGEM, MAX_HABILIDADES, MAX_MIDIAS } from "../src/lib/limites.ts";

test("compararTempoConstante valida igualdade e rejeita desigualdade", () => {
  assert.equal(compararTempoConstante("senha123", "senha123"), true);
  assert.equal(compararTempoConstante("senha123", "senha124"), false);
  assert.equal(compararTempoConstante("curto", "muitocurto"), false);
  assert.equal(compararTempoConstante(null, "teste"), false);
});

test("urlSegura aceita protocolos legitimos e rejeita esquemas maliciosos", () => {
  assert.equal(urlSegura("https://github.com/usuario"), "https://github.com/usuario");
  assert.equal(urlSegura("http://meuprojeto.org/demo"), "http://meuprojeto.org/demo");
  assert.equal(urlSegura("javascript:alert(document.cookie)"), null);
  assert.equal(urlSegura("JAVASCRIPT:alert(1)"), null);
  assert.equal(urlSegura("vbscript:run()"), null);
  assert.equal(urlSegura("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="), null);
  assert.equal(urlSegura("file:///etc/passwd"), null);
  assert.equal(urlSegura(""), null);
  assert.equal(urlSegura(undefined), null);
});

test("urlImagemSegura valida imagens web e data URLs seguras", () => {
  assert.equal(urlImagemSegura("https://images.unsplash.com/photo-1"), "https://images.unsplash.com/photo-1");
  assert.equal(urlImagemSegura("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==") !== null, true);
  assert.equal(urlImagemSegura("data:text/html;<script>alert(1)</script>"), null);
  assert.equal(urlImagemSegura("javascript:alert(1)"), null);
});

test("sanitizarTexto remove tags script, html e limita tamanho", () => {
  const sujo = "Olá <script>alert('xss')</script><b>Mundo</b>!";
  assert.equal(sanitizarTexto(sujo), "Olá Mundo!");

  const longo = "a".repeat(300);
  assert.equal(sanitizarTexto(longo, 50).length, 50);
});

test("verificarRateLimit controla frequencia e bloqueia abuso", () => {
  const chave = `teste-rate-${Date.now()}`;
  resetarRateLimit(chave);

  // 3 tentativas permitidas em janela de 10 segundos
  assert.equal(verificarRateLimit(chave, 3, 10000).permitido, true);
  assert.equal(verificarRateLimit(chave, 3, 10000).permitido, true);
  assert.equal(verificarRateLimit(chave, 3, 10000).permitido, true);

  // 4ª tentativa deve ser bloqueada
  const bloq = verificarRateLimit(chave, 3, 10000);
  assert.equal(bloq.permitido, false);
  assert.equal(typeof bloq.tempoRestanteMs, "number");

  // Reset restaura permissão
  resetarRateLimit(chave);
  assert.equal(verificarRateLimit(chave, 3, 10000).permitido, true);
});

test("sanitizarProjetos e sanitizarMidias filtram e normalizam estruturas", () => {
  const projs = [
    {
      titulo: "  Projeto SESI  ",
      descricao: "Descricao <b>legal</b>",
      link: "https://github.com/theo",
      imagem: "https://images.unsplash.com/teste.png",
    },
    {
      titulo: "", // vazio -> deve ser ignorado
      descricao: "sem titulo",
    },
    {
      titulo: "Projeto com link malicioso",
      descricao: "teste",
      link: "javascript:alert(1)", // deve ser limpo
    },
  ];

  const resultadoProjs = sanitizarProjetos(projs);
  assert.equal(resultadoProjs.length, 2);
  assert.equal(resultadoProjs[0].titulo, "Projeto SESI");
  assert.equal(resultadoProjs[0].descricao, "Descricao legal");
  assert.equal(resultadoProjs[0].link, "https://github.com/theo");
  assert.equal(resultadoProjs[1].link, undefined);

  const midias = [
    {
      url: "https://imagem.com/foto.jpg",
      tipo: "imagem",
      legenda: "Legenda <i>segura</i>",
    },
    {
      url: "javascript:malicioso",
    },
  ];

  const resultadoMidias = sanitizarMidias(midias);
  assert.equal(resultadoMidias.length, 1);
  assert.equal(resultadoMidias[0].legenda, "Legenda segura");
});

// ── Stickers do Estudio ──────────────────────────────────────────────────

const URL_STICKER = "https://images.unsplash.com/sticker.png";

// data URL de imagem com tamanho exato em chars (22 = "data:image/png;base64,")
const dataUrlDe = (chars) => "data:image/png;base64," + "A".repeat(chars - 22);

test("sanitizarStickers corta no teto de 12 stickers", () => {
  // sem teto o aluno gravava centenas de entradas no JSONB do perfil
  const bruto = Array.from({ length: 20 }, (_, i) => ({
    url: URL_STICKER,
    rotulo: `s${i}`,
  }));
  assert.equal(sanitizarStickers(bruto).length, LIMITES_STICKERS.max);
});

test("x e y sao clampados em 0-100 e valor invalido cai no padrao 50", () => {
  const [fora, invalido, naoNumerico] = sanitizarStickers([
    { url: URL_STICKER, x: -10, y: 150 },
    { url: URL_STICKER, x: NaN, y: "50" },
    { url: URL_STICKER, x: Infinity, y: undefined },
  ]);
  assert.equal(fora.x, 0);
  assert.equal(fora.y, 100);
  assert.equal(invalido.x, 50);
  assert.equal(invalido.y, 50);
  assert.equal(naoNumerico.x, 50);
  assert.equal(naoNumerico.y, 50);
});

test("tamanho e clampado em 16..320", () => {
  const [pequeno, grande, padrao] = sanitizarStickers([
    { url: URL_STICKER, tamanho: 4 },
    { url: URL_STICKER, tamanho: 9999 },
    { url: URL_STICKER },
  ]);
  assert.equal(pequeno.tamanho, LIMITES_STICKERS.tamanhoMin);
  assert.equal(grande.tamanho, LIMITES_STICKERS.tamanhoMax);
  assert.equal(padrao.tamanho, LIMITES_STICKERS.tamanhoPadrao);
});

test("rotacao e normalizada para -180..180", () => {
  const [volta, acima, abaixo, invalida] = sanitizarStickers([
    { url: URL_STICKER, rotacao: 720 },
    { url: URL_STICKER, rotacao: 200 },
    { url: URL_STICKER, rotacao: -200 },
    { url: URL_STICKER, rotacao: "90" },
  ]);
  assert.equal(volta.rotacao, 0, "720 graus e a mesma pose de 0");
  assert.equal(acima.rotacao, -160);
  assert.equal(abaixo.rotacao, 160);
  assert.equal(invalida.rotacao, 0);
});

test("sticker com url invalida e descartado", () => {
  const r = sanitizarStickers([
    { url: "javascript:alert(1)" },
    { url: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" },
    { url: "" },
    { url: "   " },
    { url: undefined },
    { url: URL_STICKER, rotulo: "unico sobrevivente" },
  ]);
  assert.equal(r.length, 1);
  assert.equal(r[0].rotulo, "unico sobrevivente");
});

test("sticker de projeto fora da allowlist e descartado, nao vira banner", () => {
  const dentro = sanitizarStickers(
    [{ url: URL_STICKER, alvo: "projeto", projetoId: "p1" }],
    ["p1"],
  );
  assert.equal(dentro.length, 1);
  assert.equal(dentro[0].alvo, "projeto");
  assert.equal(dentro[0].projetoId, "p1");

  // projeto de outro aluno nao entra no perfil nem escorrega para o banner:
  // mudar de lugar o que o aluno posicionou e pior que sumir
  const fora = sanitizarStickers(
    [{ url: URL_STICKER, alvo: "projeto", projetoId: "p9" }],
    ["p1"],
  );
  assert.deepEqual(fora, []);

  // sem allowlist nada de projeto passa
  assert.deepEqual(
    sanitizarStickers([{ url: URL_STICKER, alvo: "projeto", projetoId: "p1" }]),
    [],
  );
  // alvo projeto sem id utilizavel tambem cai fora
  assert.deepEqual(
    sanitizarStickers([{ url: URL_STICKER, alvo: "projeto" }], ["p1"]),
    [],
  );
  assert.deepEqual(
    sanitizarStickers([{ url: URL_STICKER, alvo: "projeto", projetoId: 42 }], ["p1"]),
    [],
  );
});

test("alvo diferente de projeto cai em banner", () => {
  const r = sanitizarStickers([
    { url: URL_STICKER, alvo: "banner" },
    { url: URL_STICKER, alvo: "PROJETO" },
    { url: URL_STICKER },
  ]);
  assert.deepEqual(
    r.map((s) => s.alvo),
    ["banner", "banner", "banner"],
  );
  assert.deepEqual(
    r.map((s) => s.projetoId),
    [undefined, undefined, undefined],
  );
});

test("tipo so e gif quando for exatamente gif", () => {
  const r = sanitizarStickers([
    { url: URL_STICKER, tipo: "gif" },
    { url: URL_STICKER, tipo: "GIF" },
    { url: URL_STICKER, tipo: "imagem" },
    { url: URL_STICKER },
  ]);
  assert.deepEqual(
    r.map((s) => s.tipo),
    ["gif", "sticker", "sticker", "sticker"],
  );
});

test("rotulo perde tag HTML e respeita maxRotulo", () => {
  const [comTag, longo] = sanitizarStickers([
    { url: URL_STICKER, rotulo: "Meu <b>time</b> <script>alert(1)</script>top" },
    { url: URL_STICKER, rotulo: "a".repeat(60) },
  ]);
  assert.equal(comTag.rotulo, "Meu time top");
  assert.equal(longo.rotulo.length, LIMITES_STICKERS.maxRotulo);
});

test("data URL acima do teto por sticker e descartado", () => {
  const noLimite = dataUrlDe(LIMITES_STICKERS.maxDataUrlBytes);
  const acima = dataUrlDe(LIMITES_STICKERS.maxDataUrlBytes + 1);
  assert.equal(noLimite.length, LIMITES_STICKERS.maxDataUrlBytes);
  assert.equal(sanitizarStickers([{ url: noLimite }]).length, 1);
  assert.deepEqual(sanitizarStickers([{ url: acima }]), []);
});

test("soma dos data URLs estourando maxTotalBytes interrompe a coleta", () => {
  const noLimite = dataUrlDe(LIMITES_STICKERS.maxDataUrlBytes);
  const quantosCabem = Math.floor(
    LIMITES_STICKERS.maxTotalBytes / LIMITES_STICKERS.maxDataUrlBytes,
  );
  const bruto = Array.from({ length: quantosCabem + 3 }, () => ({ url: noLimite }));
  assert.equal(sanitizarStickers(bruto).length, quantosCabem);
});

test("entrada que nao e array devolve lista vazia", () => {
  assert.deepEqual(sanitizarStickers(null), []);
  assert.deepEqual(sanitizarStickers(undefined), []);
  assert.deepEqual(sanitizarStickers("[]"), []);
  assert.deepEqual(sanitizarStickers({ 0: { url: URL_STICKER }, length: 1 }), []);
});

test("item que nao e objeto dentro do array e ignorado", () => {
  const r = sanitizarStickers([null, "sticker", 42, { url: URL_STICKER }]);
  assert.equal(r.length, 1);
});

test("sticker sem id utilizavel ganha st-N deterministico", () => {
  const bruto = [
    { url: URL_STICKER, id: "" },
    { url: URL_STICKER },
    { url: URL_STICKER, id: 42 },
  ];
  const primeira = sanitizarStickers(bruto).map((s) => s.id);
  assert.deepEqual(primeira, ["st-1", "st-2", "st-3"]);
  // a mesma entrada tem que gerar os mesmos ids, senao o React remonta o sticker
  assert.deepEqual(sanitizarStickers(bruto).map((s) => s.id), primeira);
});

test("id do sticker e preservado e cortado em 50 chars", () => {
  const [curto, longo] = sanitizarStickers([
    { url: URL_STICKER, id: "sticker-abc" },
    { url: URL_STICKER, id: "x".repeat(80) },
  ]);
  assert.equal(curto.id, "sticker-abc");
  assert.equal(longo.id.length, 50);
});

// ── Coletor de descartes ─────────────────────────────────────────────────
// Antes o item recusado era largado em silencio: o aluno salvava o perfil, o
// resto entrava, e a foto sumia sem uma palavra. Estes testes garantem que
// cada ponto de recusa registra o motivo — e que nada entra sem motivo.

test("nada e registrado quando tudo passa", () => {
  const descartes = [];
  sanitizarMidias([{ url: "https://exemplo.com/foto.png" }], descartes);
  sanitizarProjetos([{ titulo: "Robo", imagem: "https://exemplo.com/capa.png" }], descartes);
  sanitizarStickers([{ url: URL_STICKER }], [], descartes);

  assert.deepEqual(descartes, []);
});

test("midia com data URL acima do teto vira grande-demais", () => {
  const descartes = [];
  const resultado = sanitizarMidias([{ url: dataUrlDe(MAX_DATA_URL_IMAGEM + 1) }], descartes);

  assert.equal(resultado.length, 0);
  assert.deepEqual(descartes, [{ motivo: "grande-demais", campo: "midias" }]);
});

test("midia com endereco invalido vira url-invalida", () => {
  const descartes = [];
  sanitizarMidias([{ url: "javascript:alert(1)" }], descartes);

  assert.deepEqual(descartes, [{ motivo: "url-invalida", campo: "midias" }]);
});

test("o excedente do slice vira acima-do-limite, um por item", () => {
  const descartes = [];
  const bruto = Array.from({ length: MAX_MIDIAS + 3 }, () => ({ url: "https://exemplo.com/f.png" }));

  assert.equal(sanitizarMidias(bruto, descartes).length, MAX_MIDIAS);
  assert.equal(descartes.length, 3);
  assert.ok(descartes.every((d) => d.motivo === "acima-do-limite" && d.campo === "midias"));
});

test("projeto sem titulo e capa grande sao registrados separadamente", () => {
  const descartes = [];
  const resultado = sanitizarProjetos(
    [{ titulo: "" }, { titulo: "Robo", imagem: dataUrlDe(MAX_DATA_URL_IMAGEM + 1) }],
    descartes,
  );

  // a capa ruim nao derruba o projeto: ele entra sem imagem
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].titulo, "Robo");
  assert.deepEqual(descartes, [
    { motivo: "sem-titulo", campo: "projetos" },
    { motivo: "grande-demais", campo: "projetos" },
  ]);
});

test("o link invalido do projeto e registrado, e o valido nao", () => {
  const descartes = [];
  sanitizarProjetos([{ titulo: "Ok", link: "https://github.com/joao/robo" }], descartes);
  assert.deepEqual(descartes, []);

  const resultado = sanitizarProjetos(
    [{ titulo: "Robo", link: "github.com/joao/robo" }],
    descartes,
  );

  // o projeto entra sem o link — antes o link sumia calado
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].link, undefined);
  assert.deepEqual(descartes, [{ motivo: "link-invalido", campo: "projetos" }]);
});

test("sticker de projeto que nao existe vira projeto-inexistente", () => {
  const descartes = [];
  const resultado = sanitizarStickers(
    [{ url: URL_STICKER, alvo: "projeto", projetoId: "proj-x" }],
    ["proj-1"],
    descartes,
  );

  assert.equal(resultado.length, 0);
  assert.deepEqual(descartes, [{ motivo: "projeto-inexistente", campo: "stickers" }]);
});

test("sticker repetido vira duplicado e o primeiro fica", () => {
  const descartes = [];
  const resultado = sanitizarStickers(
    [
      { url: URL_STICKER, id: "st-1" },
      { url: URL_STICKER, id: "st-1" },
    ],
    [],
    descartes,
  );

  assert.equal(resultado.length, 1);
  assert.deepEqual(descartes, [{ motivo: "duplicado", campo: "stickers" }]);
});

test("o corte no teto de stickers registra um descarte por item largado", () => {
  const descartes = [];
  const bruto = Array.from({ length: LIMITES_STICKERS.max + 3 }, () => ({ url: URL_STICKER }));

  assert.equal(sanitizarStickers(bruto, [], descartes).length, LIMITES_STICKERS.max);
  assert.equal(descartes.length, 3);
  assert.ok(descartes.every((d) => d.motivo === "acima-do-limite" && d.campo === "stickers"));
});

test("estourar o orcamento de bytes corta o resto dos stickers", () => {
  const descartes = [];
  // 4 x 512 KB fecham os 2 MB do orcamento; o quinto estoura e leva o resto
  const grande = dataUrlDe(LIMITES_STICKERS.maxDataUrlBytes);
  const bruto = Array.from({ length: 5 }, () => ({ url: grande }));

  assert.equal(sanitizarStickers(bruto, [], descartes).length, 4);
  assert.deepEqual(descartes, [{ motivo: "grande-demais", campo: "stickers" }]);
});

test("o corte por orcamento separa quem estourou de quem veio depois", () => {
  const descartes = [];
  const grande = dataUrlDe(LIMITES_STICKERS.maxDataUrlBytes);
  const bruto = [
    ...Array.from({ length: 4 }, () => ({ url: grande })),
    { url: grande }, // este estoura o orcamento
    { url: URL_STICKER }, // estes nem chegaram a ser medidos
    { url: URL_STICKER },
  ];

  assert.equal(sanitizarStickers(bruto, [], descartes).length, 4);
  assert.deepEqual(descartes, [
    { motivo: "grande-demais", campo: "stickers" },
    { motivo: "acima-do-limite", campo: "stickers" },
    { motivo: "acima-do-limite", campo: "stickers" },
  ]);
});

// ── Competencias declaradas pelo aluno ───────────────────────────────────

test("sanitizarHabilidades mantem a ordem escolhida e a lista fechada", () => {
  assert.deepEqual(
    sanitizarHabilidades(["Mobile", "Python", "Robótica"]),
    ["Mobile", "Python", "Robótica"],
  );
});

test("sanitizarHabilidades recusa o que nao esta na lista, inclusive por caixa", () => {
  // Comparacao exata de proposito: a PK de `endossos` trata `Python` e `python`
  // como habilidades distintas, entao aceitar a caixa errada criaria um chip que
  // nunca recebe endosso nenhum.
  assert.deepEqual(sanitizarHabilidades(["python", "Javascript", "Python", ""]), ["Python"]);
  assert.deepEqual(sanitizarHabilidades(["<script>alert(1)</script>"]), []);
});

test("sanitizarHabilidades deduplica", () => {
  assert.deepEqual(sanitizarHabilidades(["Python", "Python", "Python"]), ["Python"]);
});

test("sanitizarHabilidades corta no teto, sem repetir o que ja entrou", () => {
  const todas = [
    "Robótica",
    "Python",
    "Web Frontend",
    "Backend & SQL",
    "Hardware & IoT",
    "Design & UI/UX",
    "IA & Dados",
    "C++ & Embarcados",
    "Modelagem 3D",
    "Mobile",
  ];
  assert.equal(todas.length, 10);
  assert.equal(sanitizarHabilidades(todas).length, MAX_HABILIDADES);
  assert.deepEqual(sanitizarHabilidades(todas), todas.slice(0, MAX_HABILIDADES));
});

test("sanitizarHabilidades ignora o que nao e array nem string", () => {
  assert.deepEqual(sanitizarHabilidades(null), []);
  assert.deepEqual(sanitizarHabilidades("Python"), []);
  assert.deepEqual(sanitizarHabilidades([null, 42, { nome: "Python" }, "Python"]), ["Python"]);
});

// ── Foto do perfil ───────────────────────────────────────────────────────

const FOTO_OK = "https://images.unsplash.com/rosto.jpg";

test("sanitizarFoto aceita link e data URL dentro do teto", () => {
  assert.equal(sanitizarFoto(FOTO_OK), FOTO_OK);
  const noLimite = dataUrlDe(MAX_DATA_URL_FOTO);
  assert.equal(noLimite.length, MAX_DATA_URL_FOTO);
  assert.equal(sanitizarFoto(noLimite), noLimite);
});

test("sanitizarFoto recusa data URL acima do teto e diz por que", () => {
  const descartes = [];
  assert.equal(sanitizarFoto(dataUrlDe(MAX_DATA_URL_FOTO + 1), descartes), null);
  assert.deepEqual(descartes, [{ motivo: "grande-demais", campo: "foto" }]);
});

test("foto vazia e remocao deliberada, nao descarte", () => {
  // O aluno que apaga a propria foto nao perdeu nada: avisar seria ruido.
  for (const vazio of ["", "   ", null, undefined]) {
    const descartes = [];
    assert.equal(sanitizarFoto(vazio, descartes), null);
    assert.deepEqual(descartes, [], `entrada ${JSON.stringify(vazio)}`);
  }
});

test("foto com esquema perigoso vira url-invalida", () => {
  const descartes = [];
  assert.equal(sanitizarFoto("javascript:alert(1)", descartes), null);
  assert.deepEqual(descartes, [{ motivo: "url-invalida", campo: "foto" }]);
});
