import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIMITES_STICKERS,
  compararTempoConstante,
  resetarRateLimit,
  sanitizarCapa,
  sanitizarCor,
  sanitizarEmail,
  sanitizarFoto,
  sanitizarHabilidades,
  sanitizarMidias,
  sanitizarProjetos,
  sanitizarReposGithub,
  sanitizarStickers,
  sanitizarTexto,
  sanitizarVideos,
  urlImagemSegura,
  urlSegura,
  verificarRateLimit,
} from "../src/lib/seguranca.ts";
import { MAX_DATA_URL_FOTO, MAX_DATA_URL_IMAGEM, MAX_HABILIDADES, MAX_MIDIAS, MAX_VIDEOS } from "../src/lib/limites.ts";
import { corDaSala, corDoAluno } from "../src/lib/cores.ts";

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

test("projeto com id repetido vira duplicado e o primeiro fica", () => {
  const descartes = [];
  const resultado = sanitizarProjetos(
    [
      { id: "gh_1", titulo: "Robo" },
      { id: "gh_1", titulo: "Copia" },
    ],
    descartes,
  );

  // o id e o que amarra o sticker de projeto ao projeto: repetido, o mesmo
  // sticker apareceria nos dois
  assert.equal(resultado.length, 1);
  assert.equal(resultado[0].titulo, "Robo");
  assert.deepEqual(descartes, [{ motivo: "duplicado", campo: "projetos" }]);
});

test("id gerado nunca derruba um projeto, mesmo colidindo com um id do cliente", () => {
  // O id gerado e `proj-<n>`, e `n` e o tamanho da lista — entao ele bate com
  // um `proj-2` explicito assim que um projeto anterior sai. O projeto sem id
  // e legitimo: quem escolheu aquele nome fomos nos, e ele nao pode virar
  // descarte por causa disso.
  const descartes = [];
  const resultado = sanitizarProjetos(
    [
      { id: "proj-2", titulo: "Primeiro" },
      { titulo: "Segundo, sem id" },
    ],
    descartes,
  );

  assert.equal(resultado.length, 2);
  assert.deepEqual(descartes, []);
  assert.equal(resultado[0].id, "proj-2");
  assert.notEqual(resultado[1].id, resultado[0].id);
  assert.equal(resultado[1].titulo, "Segundo, sem id");
});

test("id gerado nao rouba o nome de um projeto do cliente que vem depois", () => {
  // A mesma armadilha do teste acima, na ordem inversa — e era a que passava
  // batido. Numa passada so, o item sem id recebia `proj-1` (o `n` e o tamanho
  // da lista) e o projeto seguinte, cujo id de cliente e exatamente esse,
  // virava "duplicado" e sumia. Quem escolheu `proj-1` fomos nos.
  const descartes = [];
  const resultado = sanitizarProjetos(
    [
      { titulo: "Sem id, primeiro" },
      { id: "proj-1", titulo: "Do cliente" },
    ],
    descartes,
  );

  assert.equal(resultado.length, 2);
  assert.deepEqual(descartes, []);
  assert.notEqual(resultado[0].id, "proj-1");
  assert.equal(resultado[0].titulo, "Sem id, primeiro");
  assert.equal(resultado[1].id, "proj-1");
  assert.equal(resultado[1].titulo, "Do cliente");
});

test("id repetido do cliente ainda e descartado, mesmo com um sem id no meio", () => {
  // A reserva nao pode afrouxar a regra que existia: dois ids de cliente
  // iguais continuam sendo duplicata, e o primeiro fica.
  const descartes = [];
  const resultado = sanitizarProjetos(
    [
      { id: "gh_1", titulo: "Robo" },
      { titulo: "Sem id" },
      { id: "gh_1", titulo: "Copia" },
    ],
    descartes,
  );

  assert.equal(resultado.length, 2);
  assert.deepEqual(
    resultado.map((p) => p.titulo),
    ["Robo", "Sem id"],
  );
  assert.deepEqual(descartes, [{ motivo: "duplicado", campo: "projetos" }]);
});

test("varios projetos sem id recebem ids distintos", () => {
  const descartes = [];
  const resultado = sanitizarProjetos(
    [{ titulo: "A" }, { titulo: "B" }, { titulo: "C" }],
    descartes,
  );

  assert.equal(new Set(resultado.map((p) => p.id)).size, 3);
  assert.deepEqual(descartes, []);
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

test("sanitizarEmail aceita o dominio da escola, com o .br", () => {
  // O sufixo tem .br: era sem ele ate 27/09/2026, e por isso o campo recusava
  // todo endereco que a escola realmente distribui.
  assert.equal(
    sanitizarEmail("theo_padilha@estudante.sesisenai.org.br"),
    "theo_padilha@estudante.sesisenai.org.br",
  );
  assert.equal(
    sanitizarEmail("  theo_padilha@estudante.sesisenai.org.br  "),
    "theo_padilha@estudante.sesisenai.org.br",
  );
  assert.equal(
    sanitizarEmail("THEO_PADILHA@ESTUDANTE.SESISENAI.ORG.BR"),
    "theo_padilha@estudante.sesisenai.org.br",
  );
  assert.equal(
    sanitizarEmail("ana.souza-1@estudante.sesisenai.org.br"),
    "ana.souza-1@estudante.sesisenai.org.br",
  );
});

test("sanitizarEmail recusa dominio de fora, inclusive sufixo enganoso", () => {
  // O caso que importa: terminar com o dominio da escola nao basta — o
  // `@` tem que separar exatamente o dominio, senao `...org.br.evil.com` passa.
  assert.equal(sanitizarEmail("aluno@gmail.com"), null);
  assert.equal(sanitizarEmail("aluno@sesisenai.org.br"), null);
  assert.equal(sanitizarEmail("aluno@estudante.sesisenai.org.br.evil.com"), null);
  assert.equal(sanitizarEmail("aluno@sub.estudante.sesisenai.org.br"), null);
  assert.equal(sanitizarEmail("aluno@estudante.sesisenai.org.brr"), null);
  assert.equal(sanitizarEmail("aluno@outrodominio.com@estudante.sesisenai.org.br"), null);
});

test("sanitizarEmail recusa o dominio antigo, sem o .br", () => {
  // Espelha o CHECK da 014: o que a 010 aceitava deixou de valer. Um e-mail
  // gravado com o sufixo velho nao passa.
  assert.equal(sanitizarEmail("aluno@estudante.sesisenai.org"), null);
  assert.equal(sanitizarEmail("theo_padilha@estudante.sesisenai.org"), null);
  assert.equal(sanitizarEmail("aluno@estudante.sesisenai.org.evil.com"), null);
  assert.equal(sanitizarEmail("aluno@sub.estudante.sesisenai.org"), null);
  assert.equal(sanitizarEmail("aluno@estudante.sesisenai.orgg"), null);
});

test("sanitizarEmail recusa malformado e vazio sem inventar", () => {
  assert.equal(sanitizarEmail("@estudante.sesisenai.org.br"), null);
  assert.equal(sanitizarEmail("theo_padilha"), null);
  assert.equal(sanitizarEmail("theo padilha@estudante.sesisenai.org.br"), null);
  assert.equal(sanitizarEmail("theo@@estudante.sesisenai.org.br"), null);
  assert.equal(sanitizarEmail(`${"a".repeat(90)}@estudante.sesisenai.org.br`), null);
  for (const vazio of ["", "   ", null, undefined, 42]) {
    assert.equal(sanitizarEmail(vazio), null, `entrada ${JSON.stringify(vazio)}`);
  }
});

// ── Importação do GitHub ────────────────────────────────────────────────────

/** Um item no formato que a API do GitHub devolve em /users/:u/repos. */
function repoGithub(extra = {}) {
  return {
    id: 123456,
    name: "robo-seguidor-de-linha",
    description: "Robô que segue linha com PID",
    html_url: "https://github.com/theopadilha2009-hash/robo-seguidor-de-linha",
    language: "TypeScript",
    stargazers_count: 7,
    pushed_at: "2026-03-14T10:22:31Z",
    fork: false,
    ...extra,
  };
}

test("mapeia os campos que o editor usa", () => {
  const [r] = sanitizarReposGithub([repoGithub()]);
  assert.equal(r.id, 123456);
  assert.equal(r.nome, "robo-seguidor-de-linha");
  assert.equal(r.descricao, "Robô que segue linha com PID");
  assert.equal(r.url, "https://github.com/theopadilha2009-hash/robo-seguidor-de-linha");
  assert.equal(r.linguagem, "TypeScript");
  assert.equal(r.estrelas, 7);
  assert.equal(r.atualizadoEm, "2026-03-14T10:22:31Z");
});

test("fork fica de fora: o repositório é de outra pessoa", () => {
  const repos = sanitizarReposGithub([repoGithub(), repoGithub({ id: 2, fork: true })]);
  assert.equal(repos.length, 1);
  assert.equal(repos[0].id, 123456);
});

test("link de host que não é github.com não entra", () => {
  const repos = sanitizarReposGithub([
    repoGithub({ id: 1, html_url: "https://evil.example.com/a/b" }),
    // O caso que engana quem só procura "github.com" na string: o host é
    // `github.com.evil.com`, e o domínio real é o do atacante.
    repoGithub({ id: 2, html_url: "https://github.com.evil.com/a/b" }),
    repoGithub({ id: 3, html_url: "https://github.com/a/b" }),
  ]);
  assert.deepEqual(
    repos.map((r) => r.id),
    [3],
  );
});

test("esquema perigoso não entra nem com host do GitHub", () => {
  const repos = sanitizarReposGithub([
    repoGithub({ id: 1, html_url: "javascript:alert(1)//github.com/a/b" }),
    repoGithub({ id: 2, html_url: "http://github.com/a/b" }),
  ]);
  assert.deepEqual(repos, []);
});

test("item estranho é descartado em silêncio, sem derrubar o resto", () => {
  const repos = sanitizarReposGithub([
    null,
    "texto solto",
    42,
    repoGithub({ id: 7 }),
    repoGithub({ id: 8, name: "" }),
    repoGithub({ id: 9, name: "   " }),
  ]);
  assert.deepEqual(
    repos.map((r) => r.id),
    [7],
  );
});

test("item sem id numérico é descartado: o id é a identidade na tela", () => {
  const semId = { name: "sem-id", html_url: "https://github.com/u/sem-id" };
  assert.deepEqual(sanitizarReposGithub([semId]), []);
  assert.deepEqual(sanitizarReposGithub([{ ...semId, id: "123" }]), []);
  // O `id` é a `key` do React e o que o checkbox marca: se dois itens sem id
  // caíssem no mesmo valor de fallback, marcar um mexeria no outro.
  assert.deepEqual(sanitizarReposGithub([semId, { ...semId, name: "outro" }]), []);
});

test("campos ausentes viram neutro, não undefined", () => {
  const [r] = sanitizarReposGithub([
    { id: 5, name: "sem-nada", html_url: "https://github.com/u/sem-nada" },
  ]);
  assert.equal(r.descricao, "");
  assert.equal(r.linguagem, null);
  assert.equal(r.estrelas, 0);
  assert.equal(r.atualizadoEm, "");
});

test("resposta que não é lista devolve lista vazia", () => {
  assert.deepEqual(sanitizarReposGithub(null), []);
  assert.deepEqual(sanitizarReposGithub({ message: "Not Found" }), []);
  assert.deepEqual(sanitizarReposGithub(undefined), []);
});

test("descrição com HTML não passa crua", () => {
  const [r] = sanitizarReposGithub([
    repoGithub({ description: "<script>alert('xss')</script>Projeto" }),
  ]);
  assert.ok(!r.descricao.includes("<"), `veio com marcação: ${r.descricao}`);
  assert.ok(r.descricao.includes("Projeto"));
});

// ── Cor de destaque e capa do perfil ───────────────────────────────────────

test("sanitizarCor aceita só a paleta e devolve a forma canônica", () => {
  assert.equal(sanitizarCor("#3FC2BC"), "#3FC2BC");
  // Caixa normalizada: o CHECK do banco é case-sensitive, e gravar `#3fc2bc`
  // seria recusado lá depois de passar aqui.
  assert.equal(sanitizarCor("#3fc2bc"), "#3FC2BC");
  assert.equal(sanitizarCor("  #D74D42  "), "#D74D42");
});

test("sanitizarCor recusa cor de fora e o que não é cor", () => {
  // Cor livre é o caso que a allowlist existe para barrar: amarelo claro sobre
  // fundo claro some da tela.
  assert.equal(sanitizarCor("#ffffff"), null);
  assert.equal(sanitizarCor("red"), null);
  assert.equal(sanitizarCor("#3FC2BC; background: url(x)"), null);
  assert.equal(sanitizarCor(""), null);
  assert.equal(sanitizarCor(null), null);
  assert.equal(sanitizarCor(42), null);
});

test("sanitizarCapa usa o teto próprio, maior que o da foto", () => {
  const png1x1 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  assert.equal(sanitizarCapa(png1x1), png1x1);

  // Uma capa entre o teto da foto e o dela: cabe na capa, não na foto. Se os
  // dois tetos fossem o mesmo, `MAX_DATA_URL_CAPA` não estaria fazendo nada.
  const meio = `data:image/png;base64,${"A".repeat(MAX_DATA_URL_FOTO + 1000)}`;
  assert.equal(sanitizarCapa(meio), meio);
  assert.equal(sanitizarFoto(meio), null);
});

test("sanitizarCapa recusa esquema perigoso", () => {
  assert.equal(sanitizarCapa("javascript:alert(1)"), null);
});

test("corDoAluno cai na cor da sala quando o aluno não escolheu", () => {
  assert.equal(corDoAluno(null, "DSM3"), corDaSala("DSM3"));
  assert.equal(corDoAluno(undefined, "DSM3"), corDaSala("DSM3"));
  assert.equal(corDoAluno("", "DSM3"), corDaSala("DSM3"));
  // Com escolha, o hash da sala não manda mais.
  assert.equal(corDoAluno("#F3B544", "DSM3"), "#F3B544");
  // Sala ausente não explode: cai no hash da string vazia.
  assert.equal(corDoAluno(null, null), corDaSala(""));
});

// ── Vídeos ───────────────────────────────────────────────────────────────
// O que entra no banco é `{ id, tipo }` normalizado, nunca a URL colada. Isso é
// o oposto deliberado de `sanitizarMidias`: lá a URL do aluno é aceita e vira
// `<img>`; aqui ela vira `<iframe>`, e por isso passa por allowlist fechada.

test("sanitizarVideos normaliza a URL colada e descarta os parametros do link", () => {
  const videos = sanitizarVideos([
    { url: "https://youtu.be/dQw4w9WgXcQ?si=AbCdEf12345" },
    { url: "https://www.youtube.com/watch?v=abcdefghijk&t=42s" },
    { url: "https://vimeo.com/76979871" },
  ]);

  assert.deepEqual(videos, [
    { id: "dQw4w9WgXcQ", tipo: "youtube" },
    { id: "abcdefghijk", tipo: "youtube" },
    { id: "76979871", tipo: "vimeo" },
  ]);
});

test("sanitizarVideos aceita de volta o que ja esta gravado", () => {
  // O editor manda URL crua; o que volta do banco e `{ id, tipo }`. Sem este
  // ramo, salvar o perfil sem tocar nos videos apagaria todos eles.
  const videos = sanitizarVideos([
    { id: "dQw4w9WgXcQ", tipo: "youtube", titulo: "Braço robótico" },
    { id: "76979871", tipo: "vimeo" },
  ]);

  assert.deepEqual(videos, [
    { id: "dQw4w9WgXcQ", tipo: "youtube", titulo: "Braço robótico" },
    { id: "76979871", tipo: "vimeo" },
  ]);
});

test("sanitizarVideos recusa host que so parece o da plataforma", () => {
  const descartes = [];
  const videos = sanitizarVideos(
    [
      { url: `https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ` },
      { url: "https://exemplo.com/video.mp4" },
      { url: "javascript:alert(1)" },
    ],
    descartes,
  );

  assert.deepEqual(videos, []);
  assert.deepEqual(descartes, [
    { motivo: "url-invalida", campo: "videos" },
    { motivo: "url-invalida", campo: "videos" },
    { motivo: "url-invalida", campo: "videos" },
  ]);
});

test("sanitizarVideos nao deixa passar registro corrompido do banco", () => {
  // Um id gravado que nao passa no regex do normalizador cai — e o registro
  // invalido nao vira um iframe apontando para lugar nenhum.
  const descartes = [];
  const videos = sanitizarVideos(
    [
      { id: "../../etc/passwd", tipo: "youtube" },
      { id: "dQw4w9WgXcQ", tipo: "desconhecido" },
      { id: "dQw4w9WgXcQ" },
    ],
    descartes,
  );

  assert.deepEqual(videos, []);
  assert.equal(descartes.length, 3);
});

test("sanitizarVideos corta o titulo e respeita o teto de contagem", () => {
  const videos = sanitizarVideos(
    Array.from({ length: MAX_VIDEOS + 2 }, () => ({ url: "https://youtu.be/dQw4w9WgXcQ" })),
  );
  assert.equal(videos.length, MAX_VIDEOS);

  const descartes = [];
  sanitizarVideos(
    Array.from({ length: MAX_VIDEOS + 2 }, () => ({ url: "https://youtu.be/dQw4w9WgXcQ" })),
    descartes,
  );
  assert.equal(descartes.length, 2);
  assert.ok(descartes.every((d) => d.motivo === "acima-do-limite" && d.campo === "videos"));

  const [comTitulo] = sanitizarVideos([
    { id: "dQw4w9WgXcQ", tipo: "youtube", titulo: "T".repeat(200) },
  ]);
  assert.equal(comTitulo.titulo.length, 80);
});

test("sanitizarVideos devolve lista vazia para entrada que nao e array", () => {
  assert.deepEqual(sanitizarVideos(null), []);
  assert.deepEqual(sanitizarVideos("nao e lista"), []);
  assert.deepEqual(sanitizarVideos([null, 42, "texto"]), []);
});
