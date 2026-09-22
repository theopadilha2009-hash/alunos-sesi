import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ESTRELADOS,
  TODAS,
  filtrarAlunos,
  fold,
  matches,
} from "../src/lib/busca.ts";
import { parseLista, detectarSeparador } from "../src/lib/importar.ts";
import {
  handleLinkedin,
  iniciais,
  normalizarGithub,
  normalizarLinkedin,
  urlGithub,
} from "../src/lib/links.ts";
import { ordenarAlunos, rankingSalas } from "../src/lib/ranking.ts";
import { slugificar, slugUnico } from "../src/lib/slug.ts";

// ── busca ────────────────────────────────────────────────────────────────

test("fold ignora acento e caixa", () => {
  assert.equal(fold("João"), fold("joao"));
  assert.equal(fold(null), "");
});

test("sala escrita de tres jeitos da a mesma busca", () => {
  assert.equal(fold("3ºA"), "3a");
  assert.equal(fold("3oA"), "3a");
  assert.equal(fold("3A"), "3a");
  assert.equal(fold("3ºA"), fold("3oa"));
});

test("busca acha o aluno sem acento, por nome, sala e handle", () => {
  const ana = {
    id: "1",
    nome: "Ana Júlia Conceição",
    sala: "3ºA",
    salaId: "s1",
    github: "anajulia",
    linkedin: "https://www.linkedin.com/in/ana-julia",
    estrelas: 0,
  };
  assert.ok(matches(ana, "julia"));
  assert.ok(matches(ana, "3oa"));
  assert.ok(matches(ana, "3ºA"));
  assert.ok(matches(ana, "3A"));
  assert.ok(matches(ana, "anajulia"));
  assert.ok(matches(ana, "ana conceicao"));
  assert.ok(!matches(ana, "bruno"));
  assert.ok(matches(ana, ""), "query vazia nao filtra nada");
});

test("filtro de sala nao vaza outra sala", () => {
  const alunos = [
    { id: "1", nome: "Ana", sala: "3ºA", salaId: "s1", estrelas: 0 },
    { id: "2", nome: "Bruno", sala: "2ºB", salaId: "s2", estrelas: 0 },
  ];
  const so3a = filtrarAlunos(alunos, { sala: "s1" });
  assert.deepEqual(so3a.map((a) => a.nome), ["Ana"]);
  assert.equal(filtrarAlunos(alunos, { sala: TODAS }).length, 2);
});

test("atalho de estrelados ignora a sala", () => {
  const alunos = [
    { id: "1", nome: "Ana", sala: "3ºA", salaId: "s1", estrelas: 0 },
    { id: "2", nome: "Bruno", sala: "2ºB", salaId: "s2", estrelas: 0 },
  ];
  const meus = filtrarAlunos(alunos, { sala: ESTRELADOS, estrelados: ["2"] });
  assert.deepEqual(meus.map((a) => a.nome), ["Bruno"]);
});

// ── links ────────────────────────────────────────────────────────────────

test("github aceita url, @handle e handle solto", () => {
  assert.equal(normalizarGithub("https://github.com/ana-silva"), "ana-silva");
  assert.equal(normalizarGithub("github.com/ana-silva"), "ana-silva");
  assert.equal(normalizarGithub("@ana-silva"), "ana-silva");
  assert.equal(normalizarGithub("ana-silva"), "ana-silva");
  assert.equal(normalizarGithub("https://github.com/ana-silva/"), "ana-silva");
  assert.equal(normalizarGithub("https://github.com/ana-silva?tab=repos"), "ana-silva");
});

test("github recusa o que nao e handle", () => {
  assert.equal(normalizarGithub(""), null);
  assert.equal(normalizarGithub("   "), null);
  assert.equal(normalizarGithub("-comeca-com-hifen"), null);
  assert.equal(normalizarGithub("termina-com-hifen-"), null);
  assert.equal(normalizarGithub("tem espaço"), null);
  assert.equal(normalizarGithub("a".repeat(40)), null);
});

test("linkedin sempre sai como url canonica", () => {
  const esperado = "https://www.linkedin.com/in/ana-silva";
  assert.equal(normalizarLinkedin("https://www.linkedin.com/in/ana-silva"), esperado);
  assert.equal(normalizarLinkedin("linkedin.com/in/ana-silva"), esperado);
  assert.equal(normalizarLinkedin("https://br.linkedin.com/in/ana-silva"), esperado);
  assert.equal(normalizarLinkedin("in/ana-silva"), esperado);
  assert.equal(normalizarLinkedin("@ana-silva"), esperado);
  assert.equal(normalizarLinkedin("ana-silva"), esperado);
  assert.equal(normalizarLinkedin("https://www.linkedin.com/in/ana-silva/"), esperado);
});

test("linkedin recusa vazio e link que nao e perfil", () => {
  assert.equal(normalizarLinkedin(""), null);
  assert.equal(normalizarLinkedin("https://www.linkedin.com/company/acme"), null);
});

test("url do github e handle do linkedin", () => {
  assert.equal(urlGithub("ana"), "https://github.com/ana");
  assert.equal(urlGithub(null), null);
  assert.equal(
    handleLinkedin("https://www.linkedin.com/in/ana-silva"),
    "ana-silva",
  );
  assert.equal(handleLinkedin(null), null);
});

test("iniciais pega primeiro e ultimo nome", () => {
  assert.equal(iniciais("Ana Júlia Conceição"), "AC");
  assert.equal(iniciais("Bruno"), "BR");
  assert.equal(iniciais("   "), "?");
});

// ── slug ─────────────────────────────────────────────────────────────────

test("slug tira acento, espaco e caixa", () => {
  assert.equal(slugificar("Ana Júlia Conceição"), "ana-julia-conceicao");
  assert.equal(slugificar("  João   Pedro  "), "joao-pedro");
  assert.equal(slugificar("Maria D'Ávila"), "maria-d-avila");
});

test("slug nunca colide e nunca sai vazio", () => {
  assert.equal(slugUnico("Ana Silva", []), "ana-silva");
  assert.equal(slugUnico("Ana Silva", ["ana-silva"]), "ana-silva-2");
  assert.equal(slugUnico("Ana Silva", ["ana-silva", "ana-silva-2"]), "ana-silva-3");
  assert.equal(slugificar("!!!"), "aluno");
});

test("slug cabe no limite da constraint do banco", () => {
  const s = slugificar("a".repeat(200));
  assert.ok(s.length <= 60, `slug tem ${s.length} chars`);
  assert.match(s, /^[a-z0-9-]{2,80}$/);
});

// ── importar ─────────────────────────────────────────────────────────────

test("detecta o separador pelo que mais aparece", () => {
  assert.equal(detectarSeparador("Ana\t3ºA\thttps://x\ty"), "\t");
  assert.equal(detectarSeparador("Ana,3ºA,https://x,y"), ",");
  assert.equal(detectarSeparador("Ana;3ºA;https://x;y"), ";");
  assert.equal(detectarSeparador("Ana"), "\t", "sem separador cai no tab");
});

test("le lista colada de planilha, com cabecalho", () => {
  const r = parseLista(
    [
      "nome\tsala\tlinkedin\tgithub",
      "Ana Silva\t3ºA\thttps://www.linkedin.com/in/ana-silva\tanasilva",
      "Bruno Costa\t2ºB\t\tbrunocosta",
    ].join("\n"),
  );
  assert.equal(r.tinhaCabecalho, true);
  assert.equal(r.separador, "\t");
  assert.equal(r.linhas.length, 2);
  assert.equal(r.erros.length, 0);
  assert.equal(r.linhas[0].nome, "Ana Silva");
  assert.equal(r.linhas[0].linha, 2, "numero da linha e o do texto colado");
  assert.equal(r.linhas[1].linkedin, "", "celula vazia vira string vazia");
});

test("cabecalho fora de ordem ainda liga as colunas certas", () => {
  const r = parseLista(
    ["github,nome,sala", "anasilva,Ana Silva,3ºA"].join("\n"),
  );
  assert.equal(r.linhas.length, 1);
  assert.equal(r.linhas[0].nome, "Ana Silva");
  assert.equal(r.linhas[0].sala, "3ºA");
  assert.equal(r.linhas[0].github, "anasilva");
});

test("sem cabecalho, a ordem posicional e nome sala linkedin github", () => {
  const r = parseLista("Ana Silva\t3ºA\tanasilva\tana-silva");
  assert.equal(r.tinhaCabecalho, false);
  assert.equal(r.linhas[0].nome, "Ana Silva");
  assert.equal(r.linhas[0].linkedin, "anasilva");
  assert.equal(r.linhas[0].github, "ana-silva");
});

test("linha sem nome ou sem sala vira erro, nao vira aluno", () => {
  const r = parseLista(
    [
      "nome\tsala\tlinkedin\tgithub",
      "\t3ºA\t\t",
      "Ana Silva\t\t\t",
      "J\t3ºA\t\t",
      "Bruno Costa\t2ºB\t\t",
    ].join("\n"),
  );
  assert.equal(r.linhas.length, 1);
  assert.equal(r.linhas[0].nome, "Bruno Costa");
  assert.deepEqual(
    r.erros.map((e) => e.motivo),
    ["sem nome", "sem sala", "nome curto demais"],
  );
  assert.equal(r.erros[0].linha, 2, "o erro aponta a linha do texto colado");
});

test("nome de 2 letras passa, igual a constraint do banco", () => {
  // "Jo" e "Ed" sao nomes reais; a CHECK do banco aceita a partir de 2.
  const r = parseLista("Jo\t3ºA\t\t");
  assert.equal(r.linhas.length, 1);
  assert.equal(r.erros.length, 0);
});

test("duplicata na mesma colagem e contada e nao duplica", () => {
  const r = parseLista(
    ["Ana Silva\t3ºA\t\t", "ana silva\t3ºa\t\t", "Bruno\t2ºB\t\t"].join("\n"),
  );
  assert.equal(r.linhas.length, 2);
  assert.equal(r.duplicadas, 1, "mesmo nome e sala, so muda caixa/espaco");
});

test("linhas em branco nao viram erro nem deslocam a contagem", () => {
  const r = parseLista("Ana\t3ºA\n\n\nBruno\t2ºB\n");
  assert.equal(r.linhas.length, 2);
  assert.equal(r.erros.length, 0);
  assert.deepEqual(r.linhas.map((l) => l.linha), [1, 4]);
});

test("texto vazio devolve resultado vazio", () => {
  const r = parseLista("   \n  \n");
  assert.deepEqual(r.linhas, []);
  assert.deepEqual(r.erros, []);
});

// ── ranking ──────────────────────────────────────────────────────────────

test("fixado e destaque mandam antes das estrelas", () => {
  const lista = [
    { id: "a", nome: "Ana", fixado: false, destaque: false, estrelas: 99 },
    { id: "b", nome: "Bruno", fixado: false, destaque: true, estrelas: 0 },
    { id: "c", nome: "Carla", fixado: true, destaque: false, estrelas: 0 },
  ];
  assert.deepEqual(
    ordenarAlunos(lista).map((a) => a.nome),
    ["Carla", "Bruno", "Ana"],
  );
});

test("empate de estrelas cai no nome, e o desempate e estavel", () => {
  const lista = [
    { id: "3", nome: "Álvaro", fixado: false, destaque: false, estrelas: 5 },
    { id: "1", nome: "Alvaro", fixado: false, destaque: false, estrelas: 5 },
    { id: "2", nome: "Beatriz", fixado: false, destaque: false, estrelas: 5 },
  ];
  const uma = ordenarAlunos(lista).map((a) => a.id);
  const outra = ordenarAlunos([...lista].reverse()).map((a) => a.id);
  assert.deepEqual(uma, outra, "a ordem nao pode depender da entrada");
  assert.equal(uma[uma.length - 1], "2", "Beatriz fica por ultimo");
});

test("ordenar nao mexe no array original", () => {
  const lista = [
    { id: "a", nome: "Ana", fixado: false, destaque: false, estrelas: 1 },
    { id: "b", nome: "Bruno", fixado: false, destaque: false, estrelas: 9 },
  ];
  ordenarAlunos(lista);
  assert.equal(lista[0].nome, "Ana");
});

test("ranking de salas desempata por completude", () => {
  const salas = [
    { id: "1", nome: "3ºA", alunos: 10, estrelas: 5, completude: 40 },
    { id: "2", nome: "2ºB", alunos: 10, estrelas: 5, completude: 90 },
    { id: "3", nome: "1ºC", alunos: 10, estrelas: 9, completude: 10 },
  ];
  assert.deepEqual(
    rankingSalas(salas).map((s) => s.nome),
    ["1ºC", "2ºB", "3ºA"],
  );
});

// ── habilidades ──────────────────────────────────────────────────────────

test("extrai habilidades tecnicas da bio com precisao", async () => {
  const { extrairHabilidades } = await import("../src/lib/habilidades.ts");
  const bio = "Especialista em robotica FLL, programacao Python e Arduino para automacao.";
  const habs = extrairHabilidades(bio);
  assert.ok(habs.includes("Robótica"));
  assert.ok(habs.includes("Python"));
  assert.ok(habs.includes("Hardware & IoT"));
});

test("filtra alunos por habilidade tecnica", () => {
  const alunos = [
    { id: "1", nome: "Lucas", sala: "3ºA", salaId: "s1", estrelas: 0, habilidades: ["Robótica", "Python"] },
    { id: "2", nome: "Sofia", sala: "3ºA", salaId: "s1", estrelas: 0, habilidades: ["Design & UI/UX"] },
  ];
  const robotica = filtrarAlunos(alunos, { habilidade: "Robótica" });
  assert.deepEqual(robotica.map((a) => a.nome), ["Lucas"]);
  const todas = filtrarAlunos(alunos, { habilidade: "Todas" });
  assert.equal(todas.length, 2);
});
