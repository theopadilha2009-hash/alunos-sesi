import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alvoDaSala, SENTINELA_NOVA_TURMA } from "../src/lib/sala-do-aluno.ts";

/**
 * A decisão da troca de turma do painel ADM.
 *
 * **O que este teste guarda.** `mudarSalaDoAluno` recebe DOIS campos do
 * formulário da linha — `salaId` (o `<select>`) e `sala` (o nome digitado no
 * "+ Nova turma...") — e precisa decidir, entre eles, se a troca é para uma
 * turma que já existe ou para uma que ainda vai nascer. Errar a decisão não dá
 * erro: matricula o aluno na turma errada, ou cria uma sala com o sentinela do
 * seletor como nome.
 *
 * A decisão é pura de propósito (`src/lib/sala-do-aluno.ts`): a action roda
 * atrás de `exigirAdm()` e escreve no Supabase, então o teste dela é a tela, e
 * até o PR #74 esta lógica não tinha rede nenhuma — os dois caminhos foram
 * escritos à mão dentro da action, com aninhamento de `if`, e a revisão não
 * tinha o que rodar.
 */

const UUID = "8f14e45f-ceea-467a-9a3f-1c4b0c3d9e11";

test("id de turma existente ganha do nome, mesmo com os dois preenchidos", () => {
  assert.deepEqual(alvoDaSala(UUID, "DSM3-25"), { tipo: "id", salaId: UUID });
});

test("id com espaço em volta ainda é id", () => {
  assert.deepEqual(alvoDaSala(` ${UUID} `, ""), { tipo: "id", salaId: UUID });
});

test("nome digitado vira o alvo, normalizado como o banco identifica turma", () => {
  // `garantirSala` casa por `chaveDaSala` (trim + caixa): "dsm3" e "DSM3" são a
  // MESMA turma lá, e o alvo já sai normalizado para não depender disso.
  assert.deepEqual(alvoDaSala("", "  dsm3-26 "), { tipo: "nome", nome: "DSM3-26" });
});

test("o sentinela do seletor não vira turma: quem manda é o nome digitado", () => {
  // O "+ Nova turma..." deixa o sentinela no campo `salaId` e o nome de verdade
  // em `sala`. Lido como id, ele criaria uma sala chamada "__NOVA__".
  assert.deepEqual(alvoDaSala(SENTINELA_NOVA_TURMA, "Turma do Fundão"), {
    tipo: "nome",
    nome: "TURMA DO FUNDÃO",
  });
});

test("o sentinela sozinho não é turma nenhuma", () => {
  // ADM abre o "+ Nova turma...", fecha o `prompt` e o formulário segue viagem.
  assert.deepEqual(alvoDaSala(SENTINELA_NOVA_TURMA, ""), { tipo: "nada" });
  assert.deepEqual(alvoDaSala(SENTINELA_NOVA_TURMA.toUpperCase(), ""), { tipo: "nada" });
});

test("turma oficial sem linha no banco chega pelo nome (o id da opção é o nome)", () => {
  // `opcoesTurmas` usa o próprio rótulo como id quando a turma oficial não
  // existe em `salas` — é o caso que faz a troca criar a turma.
  assert.deepEqual(alvoDaSala("DSM2-26", ""), { tipo: "nome", nome: "DSM2-26" });
});

test("formulário pela metade não é turma: nome de uma letra", () => {
  // O `btrim` do banco aceita 1 caractere; a regra de dois é do app (a mesma do
  // `criarAluno`). Recusar com frase é melhor que criar "A" em silêncio.
  assert.deepEqual(alvoDaSala("", "A"), { tipo: "nada" });
  assert.deepEqual(alvoDaSala(" A ", ""), { tipo: "nada" });
});

test("nada preenchido é nada", () => {
  assert.deepEqual(alvoDaSala("", ""), { tipo: "nada" });
  assert.deepEqual(alvoDaSala("   ", "   "), { tipo: "nada" });
});

test("o seletor usa o sentinela do módulo, não uma cópia literal", () => {
  // O `<option value=...>` e quem lê o campo precisam falar do MESMO valor: com
  // o literal solto nos dois lados, renomear um só faz o "+ Nova turma..." virar
  // nome de turma. É o mesmo defeito de classe que o `importacao.test.mjs` pega
  // na classe do recado.
  const painel = readFileSync(
    fileURLToPath(new URL("../src/components/crm/PainelAdmIntegrado.tsx", import.meta.url)),
    "utf8",
  );
  assert.ok(
    painel.includes("SENTINELA_NOVA_TURMA"),
    "o seletor de turma não usa mais o sentinela de `sala-do-aluno.ts`",
  );
  assert.ok(
    !painel.includes(`"${SENTINELA_NOVA_TURMA}"`),
    "o seletor voltou a escrever o sentinela na mão — o `<option>` e o leitor do " +
      "campo podem divergir sem nenhum teste ficar vermelho",
  );
});

test("a action do painel usa esta decisão — senão o módulo vira código morto", () => {
  // A varredura é a mesma ideia de `importacao.test.mjs` e `erro-interno.test.mjs`:
  // o que nenhum tipo pega (uma função pura que deixou de ser chamada, e a
  // decisão a se reescrever à mão dentro da action) é a varredura que pega.
  const acoes = readFileSync(
    fileURLToPath(new URL("../src/app/adm/acoes.ts", import.meta.url)),
    "utf8",
  );
  const inicio = acoes.indexOf("export async function mudarSalaDoAluno");
  assert.ok(inicio > -1, "a varredura perdeu o alvo: `mudarSalaDoAluno` sumiu de acoes.ts");

  const proxima = acoes.indexOf("export async function", inicio + 10);
  const corpo = acoes.slice(inicio, proxima === -1 ? undefined : proxima);

  assert.ok(
    corpo.includes("alvoDaSala("),
    "`mudarSalaDoAluno` voltou a decidir por conta própria entre id e nome — " +
      "a decisão mora em `src/lib/sala-do-aluno.ts`, com teste",
  );
});
