// Extensão explícita: este módulo é importado direto pelo `node --test`
// (`tests/sala-do-aluno.test.mjs`), que não tem bundler para resolver `./cores`.
// Mesma escolha de `seguranca.ts`, `desafios.ts` e `integridade.ts`.
import { chaveDaSala } from "./cores.ts";

/**
 * Decisão da troca de turma: o formulário pediu uma turma existente ou um nome?
 *
 * Mora fora da action (e fora do `.tsx`) porque é a única parte da troca que dá
 * para provar sem banco: `mudarSalaDoAluno` roda atrás de `exigirAdm()` e escreve
 * no Supabase, então o teste real dela é a tela. O que sobra é esta decisão —
 * com dois caminhos que já se atropelaram na prática (turma escolhida da lista
 * vs. turma digitada) — e ela tem rede em `tests/sala-do-aluno.test.mjs`.
 */

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * O valor que o `<select>` da linha manda quando o ADM escolhe "+ Nova turma...".
 *
 * Não é id nem nome de turma: é um pedido de criação, e o nome de verdade chega
 * no outro campo (`sala`). Sozinho não é turma nenhuma — lido como nome, ele
 * criaria uma sala chamada `__NOVA__` no banco.
 *
 * Mora aqui, e não solto no `.tsx`, porque quem interpreta o campo é esta
 * função: assim o seletor e o leitor do formulário não podem discordar.
 */
export const SENTINELA_NOVA_TURMA = "__nova__";

export type AlvoDeSala =
  /** Turma que já existe: o formulário mandou o id dela. */
  | { tipo: "id"; salaId: string }
  /** Turma pelo nome — digitada agora, ou oficial ainda sem linha no banco. */
  | { tipo: "nome"; nome: string }
  /** Não veio turma aproveitável: a linha não tem para onde ir. */
  | { tipo: "nada" };

/**
 * O que a linha está pedindo, a partir dos dois campos do formulário.
 *
 * O nome é normalizado por `chaveDaSala` — a mesma identidade de turma do banco
 * (`garantirSala` casa por ela, e o `unique` da tabela é caixa-sensível): "dsm3"
 * e "DSM3" são a mesma turma aqui como são lá.
 *
 * O id ganha do nome quando os dois vêm, porque é ele que prova que a turma
 * existe. E o nome ganha do id quando o id NÃO é um uuid: o "+ Nova turma..." do
 * seletor deixa o `SENTINELA_NOVA_TURMA` no campo `salaId` e manda o nome de
 * verdade em `sala`.
 *
 * Dois casos terminam em `nada`, os dois com formulário pela metade: nome com
 * menos de dois caracteres depois da normalização (a coluna aceita 1; a regra de
 * dois é do app, a mesma do `criarAluno` e da importação) e o sentinela sozinho,
 * sem nome nenhum atrás — que é o ADM abrindo o "+ Nova turma...", desistindo do
 * `prompt` e o formulário seguindo viagem. Em vez de criar a turma `__NOVA__` no
 * banco, a action devolve a frase.
 */
export function alvoDaSala(salaIdParam: string, nomeSala: string): AlvoDeSala {
  const id = salaIdParam.trim();
  if (RE_UUID.test(id)) return { tipo: "id", salaId: id };

  const nome = chaveDaSala(nomeSala || id);
  if (nome.length < 2 || nome === chaveDaSala(SENTINELA_NOVA_TURMA)) return { tipo: "nada" };

  return { tipo: "nome", nome };
}
