import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compararTempoConstante,
  resetarRateLimit,
  sanitizarMidias,
  sanitizarProjetos,
  sanitizarTexto,
  urlImagemSegura,
  urlSegura,
  verificarRateLimit,
} from "../src/lib/seguranca.ts";

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
