import assert from "node:assert/strict";
import { test } from "node:test";
import { HOSTS_EMBED_CSP, montarCsp } from "../src/lib/csp.ts";
import { HOSTS_EMBED, mesmoVideo, normalizarVideo, urlEmbed, urlMiniatura } from "../src/lib/video.ts";

const YT = "dQw4w9WgXcQ";
const VIMEO = "76979871";

const PROD = montarCsp("abc123DEF456-_ghi", false);

/** Lê o valor de uma diretiva, ex.: `diretiva(PROD, "frame-src")`. */
function diretiva(csp, nome) {
  const achada = csp.split("; ").find((d) => d === nome || d.startsWith(`${nome} `));
  assert.ok(achada, `diretiva ${nome} ausente da CSP`);
  return achada.slice(nome.length).trim();
}

// ── normalizarVideo: as formas que o aluno realmente cola ───────────────────

test("normalizarVideo aceita as formas do YouTube", () => {
  // Cada uma é um jeito diferente de copiar o link: barra de endereço, botão
  // "compartilhar", "copiar link" de um Short, e o endereço de um embed.
  const formas = [
    `https://youtu.be/${YT}`,
    `https://www.youtube.com/watch?v=${YT}`,
    `https://youtube.com/watch?v=${YT}`,
    `https://m.youtube.com/watch?v=${YT}`,
    `https://www.youtube.com/embed/${YT}`,
    `https://www.youtube.com/shorts/${YT}`,
    `https://www.youtube.com/live/${YT}`,
    `https://www.youtube-nocookie.com/embed/${YT}`,
  ];

  for (const url of formas) {
    assert.deepEqual(normalizarVideo(url), { id: YT, tipo: "youtube" }, url);
  }
});

test("normalizarVideo aceita as formas do Vimeo", () => {
  for (const url of [
    `https://vimeo.com/${VIMEO}`,
    `https://www.vimeo.com/${VIMEO}`,
    `https://player.vimeo.com/video/${VIMEO}`,
  ]) {
    assert.deepEqual(normalizarVideo(url), { id: VIMEO, tipo: "vimeo" }, url);
  }
});

test("normalizarVideo descarta o que a plataforma acrescenta ao link", () => {
  // `?si=` é rastreador de compartilhamento e `&t=42` é marca de tempo: os
  // dois são do link, não do vídeo. Gravar a URL original levaria os dois
  // para o banco e faria o embed começar no meio em um caso e não no outro.
  assert.deepEqual(normalizarVideo(`https://youtu.be/${YT}?si=AbCdEf12345`), { id: YT, tipo: "youtube" });
  assert.deepEqual(normalizarVideo(`https://www.youtube.com/watch?v=${YT}&t=42s&list=PLabc`), { id: YT, tipo: "youtube" });
  assert.deepEqual(normalizarVideo(`https://vimeo.com/${VIMEO}?share=copy`), { id: VIMEO, tipo: "vimeo" });
});

test("normalizarVideo completa o protocolo quando o aluno cola sem ele", () => {
  // Copiar do campo de endereço às vezes perde o esquema, e o erro que o
  // aluno veria ("não é um link válido") não explicaria o motivo.
  assert.deepEqual(normalizarVideo(`youtu.be/${YT}`), { id: YT, tipo: "youtube" });
  assert.deepEqual(normalizarVideo(`www.youtube.com/watch?v=${YT}`), { id: YT, tipo: "youtube" });
});

test("normalizarVideo recusa host que so PARECE o da plataforma", () => {
  // O caso que uma checagem por substring deixaria passar. São as duas
  // direções: sufixo colado no host verdadeiro e subdomínio forjado.
  const armadilhas = [
    `https://youtube.com.evil.com/watch?v=${YT}`,
    `https://youtu.be.evil.com/${YT}`,
    `https://evil-youtube.com/watch?v=${YT}`,
    `https://youtube.com.br/watch?v=${YT}`,
    `https://notyoutube.com/watch?v=${YT}`,
    `https://vimeo.com.evil.com/${VIMEO}`,
  ];

  for (const url of armadilhas) {
    assert.equal(normalizarVideo(url), null, url);
  }
});

test("normalizarVideo recusa http, que a pagina bloquearia em silencio", () => {
  // `upgrade-insecure-requests` está ligado: um iframe http é bloqueado sem
  // erro visível, e o vídeo simplesmente não aparece.
  assert.equal(normalizarVideo(`http://youtu.be/${YT}`), null);
  assert.equal(normalizarVideo(`http://vimeo.com/${VIMEO}`), null);
});

test("normalizarVideo recusa id com forma errada", () => {
  // O id vira parte da URL do iframe: um valor livre aqui é injeção no
  // endereço do embed.
  const ruins = [
    `https://youtu.be/${YT}a`, // 12 caracteres
    `https://youtu.be/${YT.slice(0, 10)}`, // 10 caracteres
    `https://youtu.be/../../etc/passwd`,
    `https://youtu.be/abc%20def`,
    `https://vimeo.com/abc`,
    `https://vimeo.com/123`,
    `https://vimeo.com/${VIMEO}00000`, // 13 dígitos: acima do teto de 12
  ];

  for (const url of ruins) {
    assert.equal(normalizarVideo(url), null, url);
  }
});

test("normalizarVideo recusa o que nao e link de video", () => {
  // A home das duas plataformas: parece o host certo, mas não tem vídeo.
  const vazios = [
    "https://www.youtube.com/",
    "https://www.youtube.com/watch",
    "https://youtu.be/",
    "https://vimeo.com/",
    "https://vimeo.com/channels/staffpicks",
    "https://exemplo.com/video",
    "javascript:alert(1)",
    "",
    "   ",
  ];

  for (const url of vazios) {
    assert.equal(normalizarVideo(url), null, JSON.stringify(url));
  }
});

test("normalizarVideo recusa entrada que nao e string", () => {
  for (const lixo of [null, undefined, 42, {}, [], true]) {
    assert.equal(normalizarVideo(lixo), null, String(lixo));
  }
});

// ── urlEmbed: o host sai daqui, nunca do que o aluno digitou ────────────────

test("urlEmbed monta o endereco a partir do tipo e do id", () => {
  assert.equal(urlEmbed({ id: YT, tipo: "youtube" }), `https://www.youtube-nocookie.com/embed/${YT}`);
  assert.equal(urlEmbed({ id: VIMEO, tipo: "vimeo" }), `https://player.vimeo.com/video/${VIMEO}`);
});

test("urlEmbed nao usa youtube.com, e sim youtube-nocookie", () => {
  // O embed comum grava cookie de rastreio no navegador de quem visita o
  // perfil — que aqui é aluno de escola, menor de idade. Trocar de volta para
  // `youtube.com/embed` faria o embed funcionar igual, e é justamente por isso
  // que precisa de teste.
  const url = urlEmbed({ id: YT, tipo: "youtube" });
  assert.equal(url.includes("youtube-nocookie.com"), true);
  assert.equal(new URL(url).host, "www.youtube-nocookie.com");
});

test("urlMiniatura so existe para o YouTube", () => {
  assert.equal(urlMiniatura({ id: YT, tipo: "youtube" }), `https://i.ytimg.com/vi/${YT}/hqdefault.jpg`);
  assert.equal(urlMiniatura({ id: VIMEO, tipo: "vimeo" }), null);
});

test("mesmoVideo compara tipo e id, ignorando o titulo", () => {
  assert.equal(mesmoVideo({ id: YT, tipo: "youtube" }, { id: YT, tipo: "youtube", titulo: "Aula 1" }), true);
  assert.equal(mesmoVideo({ id: YT, tipo: "youtube" }, { id: VIMEO, tipo: "vimeo" }), false);
  // O mesmo número nas duas plataformas não é o mesmo vídeo.
  assert.equal(mesmoVideo({ id: YT, tipo: "youtube" }, { id: YT, tipo: "vimeo" }), false);
});

test("os hosts do embed sao os que o frame-src realmente libera", () => {
  // `video.ts` e `csp.ts` são folha e não podem se importar — o type-stripping
  // do `node --test` não resolve import relativo sem extensão. Quem garante que
  // o `frame-src` cobre os dois hosts é este teste: se um mudar sozinho, o
  // iframe é bloqueado e o vídeo some sem erro visível na tela.
  //
  // A comparação é contra a CSP montada, não contra o literal de `csp.ts`: o
  // que importa é a diretiva que sai no header.
  assert.deepEqual(HOSTS_EMBED, HOSTS_EMBED_CSP);

  const frame = diretiva(PROD, "frame-src");
  assert.equal(frame, "https://www.youtube-nocookie.com https://player.vimeo.com");

  // E a origem que `urlEmbed` produz tem que estar entre as liberadas — se
  // alguém trocar o host do embed sem mexer na CSP, isto acusa.
  for (const tipo of ["youtube", "vimeo"]) {
    const origem = new URL(urlEmbed({ id: tipo === "youtube" ? YT : VIMEO, tipo })).origin;
    assert.equal(frame.includes(origem), true, `${origem} fora do frame-src`);
  }
});

test("o frame-src continua fechado: nada de curinga nem de host a mais", () => {
  // O risco deste recurso é a diretiva virar `https:` "só para funcionar". Ela
  // é a única allowlist por host que sobrou na política; um curinga aqui
  // liberaria qualquer embed, que é o que o `'none'` de antes existia para
  // impedir.
  const frame = diretiva(PROD, "frame-src");
  assert.equal(frame === "'none'", false);
  assert.equal(frame.includes("*"), false);
  assert.equal(frame.split(/\s+/).length, 2, `frame-src com fonte a mais: ${frame}`);
  assert.equal(frame.includes("http:"), false);
});
