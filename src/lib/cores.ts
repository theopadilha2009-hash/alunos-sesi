/**
 * A cor de cada sala.
 *
 * Vem das seis cores do símbolo do SESI, e é atribuída por hash do nome —
 * então "3ºA" é sempre a mesma cor, em qualquer máquina e em qualquer
 * render, sem precisar guardar isso no banco.
 *
 * É também a paleta de onde o aluno escolhe a cor de destaque do próprio
 * perfil (`alunos.cor_perfil`). Ser a mesma lista não é coincidência: a cor do perfil
 * é a mesma família visual da cor da turma, e um seletor com cores de fora da
 * marca faria o perfil destoar da escola. Se esta lista mudar, a CHECK
 * `alunos_cor_perfil_paleta` em `src/sql/012_aparencia_do_aluno.sql` muda junto.
 *
 * Sem imports de propósito: testado direto pelo `node --test`.
 */

export const CORES_SALA = [
  "#3FC2BC", // ciano
  "#38B95D", // verde
  "#F3B544", // amarelo
  "#D74D42", // vermelho
  "#4881AE", // azul claro
  "#2D929E", // petróleo
] as const;

/**
 * O nome de cada cor, para o rótulo acessível do seletor.
 *
 * Um hex não é nome: "Cor #3FC2BC" não diz nada a quem não vê a amostra. E não
 * adianta pôr isso num `title` do JSX — quem usa leitor de tela não recebe
 * `title`. A chave é o mesmo literal de `CORES_SALA`, e o teste
 * `tests/cores.test.mjs` cobra que as duas listas não se separem.
 */
const NOME_DA_COR: Record<string, string> = {
  "#3FC2BC": "ciano",
  "#38B95D": "verde",
  "#F3B544": "amarelo",
  "#D74D42": "vermelho",
  "#4881AE": "azul",
  "#2D929E": "petróleo",
};

/** O nome da cor, ou o próprio hex se ela não estiver no mapa. */
export function nomeDaCor(hex: string): string {
  return NOME_DA_COR[hex] ?? hex;
}

/**
 * A chave de identidade de uma turma: `trim` + caixa alta.
 *
 * É o que decide se o nome de sala vindo da planilha é uma turma que já existe.
 *
 * **Não confundir com o `fold` de `busca.ts`.** Aquele é equivalência de BUSCA, e
 * apaga acento, `º`, `ª` e o "o" digitado no lugar do ordinal — tudo para que
 * "3ºA", "3oA" e "3A" achem a mesma coisa quando alguém digita. Identidade é
 * outra pergunta: `salas.nome` é `unique` sem `citext` (`001_schema.sql:18`),
 * então "3ºA" e "3A" são duas linhas distintas no banco. Decidir existência por
 * `fold` funde as duas em silêncio — e como "3ºA" é o formato de verdade, a
 * planilha com "3A" matriculava o aluno na turma errada sem avisar ninguém.
 *
 * `toUpperCase` não depende de locale em JS (quem depende é o `toLocaleUpperCase`),
 * então a chave é a mesma em qualquer máquina.
 *
 * Mora aqui, e não em `turmas.ts`, porque este arquivo é sem imports de propósito
 * (lido cru pelo `node --test`) — e porque é daqui que a cor sai: a mesma chave
 * que diz "é a mesma turma" é a que garante a mesma cor.
 */
export function chaveDaSala(nome: string): string {
  return String(nome ?? "").trim().toUpperCase();
}

export function corDaSala(nome: string): string {
  // A normalização mora aqui dentro, e não em cada chamador: o contrato do
  // arquivo é "a mesma turma tem a mesma cor em qualquer tela", e com o `trim`
  // e a caixa só do lado de fora cada tela decidia por si — a vitrine passava o
  // nome cru do banco e o CRM o já achatado, e "dsm3" saía com duas cores na
  // mesma página.
  let h = 0;
  for (const ch of chaveDaSala(nome)) {
    h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  }
  return CORES_SALA[h % CORES_SALA.length];
}

/**
 * A cor que pinta o perfil: a que o aluno escolheu, ou a da sala como padrão.
 *
 * A queda para `corDaSala` é o que faz a coluna nova ser aditiva: sem escolha
 * (NULL no banco, que é o caso de todos os alunos de hoje), a cor é exatamente
 * a que o perfil já mostrava. Chamar `corDaSala` direto em cada tela passou a
 * ser errado — é este helper que sabe que existe uma escolha.
 */
export function corDoAluno(
  escolhida: string | null | undefined,
  sala: string | null | undefined,
): string {
  return escolhida || corDaSala(sala ?? "");
}
