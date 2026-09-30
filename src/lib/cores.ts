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

export function corDaSala(nome: string): string {
  // A normalização mora aqui dentro, e não em cada chamador: o contrato do
  // arquivo é "a mesma turma tem a mesma cor em qualquer tela", e com o `trim`
  // e a caixa só do lado de fora cada tela decidia por si — a vitrine passava o
  // nome cru do banco e o CRM o já achatado, e "dsm3" saía com duas cores na
  // mesma página. `toUpperCase` não depende de locale em JS (quem depende é o
  // `toLocaleUpperCase`), então o hash é o mesmo em qualquer máquina.
  let h = 0;
  for (const ch of String(nome ?? "").trim().toUpperCase()) {
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
