import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CORES_SALA, chaveDaSala, corDaSala, corDoAluno, nomeDaCor } from "../src/lib/cores.ts";

const SQL_APARENCIA = readFileSync(
  fileURLToPath(new URL("../src/sql/012_aparencia_do_aluno.sql", import.meta.url)),
  "utf8",
);

// ── corDaSala / corDoAluno ──────────────────────────────────────────────────

test("corDaSala é estável e cai numa cor da paleta", () => {
  // Valor literal, e não `corDaSala("DSM3")` comparado consigo mesmo: a
  // asserção tautológica passaria mesmo se o hash quebrasse e toda turma
  // recebesse a mesma cor. Aqui, mudar a ordem de CORES_SALA quebra o teste —
  // que é justamente o que se quer saber, porque a cor da turma já está na
  // cabeça de quem usa a vitrine.
  assert.equal(corDaSala("DSM3"), "#D74D42");
  assert.equal(corDaSala("INFO1"), "#38B95D");
  assert.ok(CORES_SALA.includes(corDaSala("")));
});

test("corDoAluno prefere a escolha e cai na cor da sala sem ela", () => {
  for (const vazio of [null, undefined, ""]) {
    assert.equal(corDoAluno(vazio, "DSM3"), "#D74D42", `vazio=${String(vazio)}`);
  }
  assert.equal(corDoAluno("#F3B544", "DSM3"), "#F3B544");
  // Sem sala e sem escolha: o perfil órfão ainda precisa de uma cor.
  assert.equal(corDoAluno(null, null), corDaSala(""));
});

// ── chaveDaSala: identidade de turma, que não é equivalência de busca ───────

test("chaveDaSala ignora caixa e espaço — mas não acento nem ordinal", () => {
  // Esta é a linha que separa `chaveDaSala` do `fold` de `busca.ts`. `fold` é
  // equivalência de BUSCA: apaga acento, `º`, `ª` e o "o" digitado no lugar do
  // ordinal, tudo para "3ºA", "3oA" e "3A" acharem a mesma coisa quando alguém
  // procura. Identidade é outra pergunta — `salas.nome` é `unique` sem `citext`
  // (`001_schema.sql:18`), então "3ºA" e "3A" são DUAS linhas no banco. Decidir
  // existência por `fold` matriculava o aluno na turma errada, em silêncio, e
  // como "3ºA" é o formato de verdade, o erro era invisível para quem digitou.
  assert.equal(chaveDaSala("  dsm3 "), chaveDaSala("DSM3"));
  assert.equal(chaveDaSala("dsm3"), "DSM3");
  assert.notEqual(chaveDaSala("3ºA"), chaveDaSala("3A"));
  assert.notEqual(chaveDaSala("3ªB"), chaveDaSala("3B"));
  assert.notEqual(chaveDaSala("Técnico"), chaveDaSala("TECNICO"));
});

test("a cor sai da chave: se as duas divergirem, a mesma turma tem duas cores", () => {
  // `corDaSala` normaliza com `chaveDaSala` por dentro, e é isso que faz a
  // vitrine e o CRM pintarem a mesma linha do mesmo jeito. Se alguém acrescentar
  // à mão uma dobra a mais dentro do hash (um `normalize("NFD")`, por exemplo),
  // a cor de "TÉCNICO" deixa de bater com a de "Técnico" — que é o mesmo defeito
  // que a normalização interna veio consertar.
  for (const nome of [" dsm3 ", "DSM3", "3ºA", "Técnico", ""]) {
    assert.equal(corDaSala(nome), corDaSala(chaveDaSala(nome)), `nome=${nome}`);
  }
});

// ── A paleta, o nome humano e o banco ───────────────────────────────────────

test("toda cor da paleta tem nome humano, e nenhum se repete", () => {
  // `nomeDaCor` devolve o proprio hex quando nao acha — entao comparar consigo
  // mesmo e o sinal de que a cor nova entrou em CORES_SALA e ficou sem nome no
  // mapa, deixando o leitor de tela anunciar "#3FC2BC".
  const nomes = CORES_SALA.map((c) => nomeDaCor(c));
  for (const [i, c] of CORES_SALA.entries()) {
    assert.notEqual(nomes[i], c, `cor ${c} sem nome humano em NOME_DA_COR`);
  }
  assert.equal(new Set(nomes).size, nomes.length, "dois hex compartilham o mesmo nome");
});

test("a paleta do app e a do CHECK no banco sao a mesma lista", () => {
  // A CHECK `alunos_cor_perfil_paleta` e escrita a mao no SQL. Sem esta amarra,
  // uma cor acrescentada so aqui faz o aluno escolher uma amostra que o banco
  // recusa — e o save inteiro falha com erro de constraint na cara dele.
  const encontrado = SQL_APARENCIA.match(/cor_perfil IN \(([^)]+)\)/);
  assert.ok(encontrado, "a CHECK de cor_perfil sumiu do 012_aparencia_do_aluno.sql");

  const noBanco = encontrado[1]
    .split(",")
    .map((s) => s.trim().replace(/^'|'$/g, ""));

  assert.deepEqual(noBanco, [...CORES_SALA]);
});
