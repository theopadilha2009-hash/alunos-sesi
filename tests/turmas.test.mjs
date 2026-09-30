import assert from "node:assert/strict";
import { test } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TURMAS_OFICIAIS } from "../src/lib/turmas.ts";

/**
 * Toda turma que o cadastro OFERECE tem que existir no banco.
 *
 * **O que este teste guarda.** O `LoginTela` monta o `<select required>` do
 * cadastro direto de `TURMAS_OFICIAIS`, e `registrarUsuario` procura a sala nas
 * linhas de `public.salas` — não cria nenhuma. As duas listas são escritas à mão,
 * em linguagens diferentes, e nada as amarrava.
 *
 * Medido em produção em 30/09/2026: das 9 turmas oferecidas no formulário,
 * existiam **duas** (`DSM3` e `DS4-25`). Quem escolhia `DS1-25`, `DS2-25`,
 * `DS1-26`, `DS2-26`, `DS1-24` ou `DS2-24` não conseguia se cadastrar — o
 * cadastro parava em "Sala não encontrada" — e quem escolhia `DSM3-25` era
 * matriculado em silêncio na linha duplicada `dsm3`, por uma busca tolerante a
 * substring que casa "dsm3" dentro de "dsm3-25".
 *
 * Durante muito tempo isso não apareceu porque havia um fallback que jogava
 * qualquer turma desconhecida em "DSM3". O aluno ia para a turma errada, calado.
 * O fallback saiu em 30/09, e aí o problema dos dados virou problema de tela.
 *
 * **A direção da asserção.** Só uma: toda turma oficial precisa nascer em algum
 * SQL do repo. O contrário não vale — o banco pode ter turma que não está na
 * lista oficial (as salas de demonstração do `002`, turmas antigas), e isso não
 * é erro. Este teste é sobre a promessa do formulário, não sobre a limpeza da
 * tabela.
 */

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR_SQL = join(RAIZ, "src", "sql");

/** Todos os `insert into public.salas ... ;` do repo, concatenados. */
function insertsDeSalas() {
  return readdirSync(DIR_SQL)
    .filter((nome) => nome.endsWith(".sql"))
    .map((nome) => readFileSync(join(DIR_SQL, nome), "utf8"))
    .join("\n")
    .match(/insert\s+into\s+public\.salas[\s\S]*?;/gi)
    ?.join("\n") ?? "";
}

test("toda turma de TURMAS_OFICIAIS é criada por algum SQL do repo", () => {
  const inserts = insertsDeSalas();

  const faltando = TURMAS_OFICIAIS.filter((t) => !inserts.includes(`'${t}'`));

  assert.deepEqual(
    faltando,
    [],
    `estas turmas são oferecidas no cadastro e nenhum SQL as cria: ${faltando.join(", ")}. ` +
      "Quem escolher uma delas ou não consegue se cadastrar, ou cai numa turma errada " +
      "por uma busca tolerante. Acrescente-as a uma migration — ver " +
      "`src/sql/018_turmas_oficiais.sql`.",
  );
});

test("a varredura enxerga os inserts — senão o teste acima passa vazio", () => {
  // Um `match` que não acha nada devolve `""`, e `"".includes("'DSM3'")` é falso
  // para tudo: o teste ficaria vermelho por engano. Mas se a regex deixar de casar
  // com o formato dos inserts (aspas, `public.` a menos, maiúsculas), o de cima
  // passa a não ver nada e vira um verde que não prova nada. Este aqui é o que
  // distingue "está tudo lá" de "a varredura parou de funcionar".
  const inserts = insertsDeSalas();
  assert.ok(inserts.length > 0, "nenhum `insert into public.salas` encontrado no src/sql");
  assert.ok(
    inserts.includes("'DSM3'"),
    "a varredura não achou nem o `DSM3` do 003 — a regex dos inserts quebrou",
  );
});
