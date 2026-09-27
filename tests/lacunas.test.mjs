import assert from "node:assert/strict";
import { test } from "node:test";
import { contarLacunas, faltaLacuna, filtrarPorLacuna, LACUNAS, ROTULO_LACUNA } from "../src/lib/lacunas.ts";

/** Um aluno com tudo preenchido; cada teste estraga só o campo que quer testar. */
function perfil(trocas = {}) {
  return { linkedin: "https://linkedin.com/in/x", github: "fulano", bio: "Faz jogos.", ...trocas };
}

// ── faltaLacuna: o que conta como lacuna ────────────────────────────────────

test("perfil preenchido não tem lacuna nenhuma", () => {
  const a = perfil();
  for (const chave of LACUNAS) {
    assert.equal(faltaLacuna(a, chave), false, `${chave} acusou lacuna em perfil completo`);
  }
});

test("linkedin e github ausentes contam como lacuna — null e undefined", () => {
  assert.equal(faltaLacuna(perfil({ linkedin: null }), "sem-linkedin"), true);
  assert.equal(faltaLacuna(perfil({ linkedin: undefined }), "sem-linkedin"), true);
  assert.equal(faltaLacuna(perfil({ github: null }), "sem-github"), true);
});

test("string vazia conta como ausente nas três", () => {
  assert.equal(faltaLacuna(perfil({ linkedin: "" }), "sem-linkedin"), true);
  assert.equal(faltaLacuna(perfil({ github: "" }), "sem-github"), true);
  assert.equal(faltaLacuna(perfil({ bio: "" }), "sem-bio"), true);
});

test("bio só com espaços é bio vazia — o editor deixa passar", () => {
  assert.equal(faltaLacuna(perfil({ bio: "   \n\t " }), "sem-bio"), true);
});

test("bio com texto não é lacuna, mesmo curta", () => {
  assert.equal(faltaLacuna(perfil({ bio: "oi" }), "sem-bio"), false);
});

test("cada lacuna olha só o próprio campo", () => {
  // Sem GitHub, mas com LinkedIn: só a lacuna de GitHub pode acusar.
  const semGithub = perfil({ github: null });
  assert.equal(faltaLacuna(semGithub, "sem-github"), true);
  assert.equal(faltaLacuna(semGithub, "sem-linkedin"), false);
  assert.equal(faltaLacuna(semGithub, "sem-bio"), false);
});

// ── filtrarPorLacuna: quem sobra na lista ───────────────────────────────────

test("filtrarPorLacuna sem chave devolve a lista inteira", () => {
  const alunos = [perfil({ linkedin: null }), perfil()];
  assert.deepEqual(filtrarPorLacuna(alunos, null), alunos);
});

test("filtrarPorLacuna devolve só quem falta o campo", () => {
  const semLinkedin = perfil({ linkedin: null, github: null });
  const semGithub = perfil({ github: null });
  const completo = perfil();

  const resultado = filtrarPorLacuna([semLinkedin, semGithub, completo], "sem-linkedin");
  assert.deepEqual(resultado, [semLinkedin]);
});

test("filtrarPorLacuna não devolve lista vazia quando todos têm o campo", () => {
  const resultado = filtrarPorLacuna([perfil(), perfil()], "sem-bio");
  assert.deepEqual(resultado, []);
});

test("filtrarPorLacuna preserva a ordem original", () => {
  const a = perfil({ github: null });
  const b = perfil({ github: null });
  assert.deepEqual(filtrarPorLacuna([a, perfil(), b], "sem-github"), [a, b]);
});

// ── contarLacunas: o que o card de sala mostra ──────────────────────────────

test("contarLacunas conta cada lacuna na mesma passada", () => {
  const alunos = [
    perfil({ linkedin: null }), // falta linkedin
    perfil({ github: null, bio: "" }), // falta github e bio
    perfil(), // nada
  ];

  const contagem = Object.fromEntries(contarLacunas(alunos).map((l) => [l.chave, l.quantos]));
  assert.deepEqual(contagem, { "sem-linkedin": 1, "sem-github": 1, "sem-bio": 1 });
});

test("contarLacunas devolve as três chaves, mesmo zeradas", () => {
  const contagem = contarLacunas([perfil()]);
  assert.equal(contagem.length, 3);
  for (const { quantos } of contagem) assert.equal(quantos, 0);
});

test("contarLacunas de lista vazia é tudo zero — turma sem alunos", () => {
  for (const { quantos } of contarLacunas([])) assert.equal(quantos, 0);
});

test("o mesmo aluno pode faltar em duas lacunas ao mesmo tempo", () => {
  const vazio = { linkedin: null, github: null, bio: null };
  const contagem = Object.fromEntries(contarLacunas([vazio]).map((l) => [l.chave, l.quantos]));
  assert.deepEqual(contagem, { "sem-linkedin": 1, "sem-github": 1, "sem-bio": 1 });
});

// ── a contagem do card bate com a lista que o clique abre ───────────────────

test("o número do card é o mesmo tamanho da lista filtrada", () => {
  const alunos = [
    perfil({ linkedin: null }),
    perfil({ linkedin: null, github: null }),
    perfil(),
    perfil({ github: null }),
  ];

  for (const { chave, quantos } of contarLacunas(alunos)) {
    assert.equal(
      filtrarPorLacuna(alunos, chave).length,
      quantos,
      `card diz ${quantos} ${chave} e a lista filtrada tem outro tamanho`,
    );
  }
});

// ── rótulos e ordem ─────────────────────────────────────────────────────────

test("toda lacuna tem rótulo, e nenhum rótulo fica órfão", () => {
  assert.deepEqual(Object.keys(ROTULO_LACUNA).sort(), [...LACUNAS].sort());
});

test("os rótulos são de tela, não nome de coluna do banco", () => {
  for (const chave of LACUNAS) {
    const rotulo = ROTULO_LACUNA[chave];
    assert.ok(rotulo.startsWith("sem "), `rótulo "${rotulo}" não começa com "sem "`);
    assert.ok(!rotulo.includes("_"), `rótulo "${rotulo}" parece nome de coluna`);
    assert.notEqual(rotulo, chave, `rótulo "${rotulo}" é a própria chave — não traduziu nada`);
  }
});
