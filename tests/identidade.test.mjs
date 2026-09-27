import assert from "node:assert/strict";
import { test } from "node:test";
import { matriculaDe } from "../src/lib/identidade.ts";

/** UUID de verdade: é o que a coluna `alunos.id` guarda. */
const ID_A = "a1417080-b591-4cc9-8558-5650a3da0546";
const ID_B = "16165112-8081-b591-4cc9-8558-5650a3da0546";

const ALUNO = { id: ID_A, slug: "theo-padilha" };

// ── o formato ───────────────────────────────────────────────────────────────

test("a matrícula tem o prefixo institucional e o nome sem hífen", () => {
  const m = matriculaDe(ALUNO);
  assert.ok(m.startsWith("SESI-SC-JVE-"), `não começou com o prefixo: ${m}`);
  assert.match(m, /^SESI-SC-JVE-THEOPADILHA-\d{4}$/);
});

test("slug com acento, hífen ou maiúscula vira só A-Z0-9", () => {
  assert.match(matriculaDe({ id: ID_A, slug: "sofia-mendonça" }), /^SESI-SC-JVE-SOFIAMENDONA-\d{4}$/);
  assert.match(matriculaDe({ id: ID_A, slug: "Ana.Souza_1" }), /^SESI-SC-JVE-ANASOUZA1-\d{4}$/);
});

test("o nome é cortado em 12 caracteres", () => {
  const m = matriculaDe({ id: ID_A, slug: "pedro-henrique-lima-da-silva" });
  const nome = m.split("-")[3];
  assert.equal(nome, "PEDROHENRIQU");
  assert.equal(nome.length, 12);
});

// ── estabilidade: é o defeito que isto corrige ──────────────────────────────

test("a MESMA entrada dá a MESMA matrícula — o número não dança", () => {
  assert.equal(matriculaDe(ALUNO), matriculaDe(ALUNO));
  assert.equal(matriculaDe({ id: ID_A, slug: "theo-padilha" }), matriculaDe(ALUNO));
});

test("a matrícula NÃO depende de estrelas", () => {
  // O defeito antigo: nas três fórmulas o sufixo vinha de `estrelas`, então
  // uma estrela de um colega mudava a matrícula impressa no crachá.
  const semEstrelas = matriculaDe(ALUNO);
  const comEstrelas = matriculaDe({ ...ALUNO, estrelas: 31 });
  assert.equal(comEstrelas, semEstrelas, "a matrícula mudou quando as estrelas mudaram");
});

test("a matrícula NÃO muda quando o aluno edita o próprio perfil", () => {
  // Nome, bio, cor e foto são editáveis; a matrícula não pode segui-los.
  const editado = matriculaDe({
    ...ALUNO,
    nome: "Theo L. Padilha",
    bio: "outra bio",
    cor_perfil: "#ff0000",
    foto_url: "https://exemplo/foto.jpg",
    habilidades: ["react"],
  });
  assert.equal(editado, matriculaDe(ALUNO));
});

test("ids diferentes dão séries diferentes (amostra grande)", () => {
  // Não é uma garantia matemática — FNV de 32 bits colide —, mas se a série
  // ignorasse o id, todos os 200 dariam o mesmo número.
  const series = new Set(
    Array.from({ length: 200 }, (_, i) => matriculaDe({ id: `${ID_A}-${i}`, slug: "theo-padilha" })),
  );
  assert.ok(series.size > 150, `só ${series.size} séries distintas em 200 alunos`);
});

test("a série tem sempre 4 dígitos, sem zero à esquerda", () => {
  for (let i = 0; i < 300; i++) {
    const m = matriculaDe({ id: `id-${i}`, slug: "aluno" });
    const serie = m.split("-").pop();
    assert.match(serie, /^[1-9]\d{3}$/, `série fora do formato: ${serie}`);
  }
});

// ── o que o cliente precisa: sem node:crypto ────────────────────────────────

test("matriculaDe roda fora do servidor — o crachá é desenhado no navegador", () => {
  // Três dos quatro consumidores são client components. Se este módulo
  // importasse `node:crypto`, o build do cliente quebraria.
  const fonte = matriculaDe.toString();
  assert.ok(!fonte.includes("crypto"), "matriculaDe não pode depender de crypto");
  assert.equal(typeof matriculaDe({ id: ID_B, slug: "lucas-bento" }), "string");
});
