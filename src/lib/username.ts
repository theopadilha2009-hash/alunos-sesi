/**
 * O nome de login — o que o aluno digita para entrar.
 *
 * A regra mudou quando a escola passou a distribuir e-mail institucional: o
 * login virou o endereço, e o formulário de cadastro rejeitava todo mundo que
 * tentasse usá-lo, porque o formato antigo só aceitava letras, números, ponto,
 * underscore e hífen. O login em si nunca validou nada (só normaliza), então a
 * conta criada à mão no banco entrava — a inconsistência estava só no cadastro,
 * que era o caminho que ninguém conseguia usar.
 *
 * O limite de 50 não é escolha de tela: é o `usuarios_username_check` do banco
 * (`001_schema.sql`). Antes o app cortava em 30 e recusava antes de chegar lá;
 * agora os dois concordam, e um endereço de 42 caracteres passa.
 */
export const MIN_USERNAME = 3;
export const MAX_USERNAME = 50;

/**
 * Letras, números, ponto, underscore, hífen e arroba.
 *
 * O `@` é a única adição, e ele não abre buraco: o valor nunca é interpolado em
 * SQL — o PostgREST o manda como parâmetro — e não vira caminho de arquivo nem
 * nome de cookie. Quem chega aqui já passou por `trim().toLowerCase()`.
 */
const FORMATO = /^[a-z0-9_.@-]+$/;

export function normalizarUsername(bruto: string): string {
  return bruto.trim().toLowerCase();
}

/** Devolve a mensagem de erro, ou `null` se o username serve. */
export function validarUsername(username: string): string | null {
  if (username.length < MIN_USERNAME || username.length > MAX_USERNAME) {
    return `O nome de usuário deve ter entre ${MIN_USERNAME} e ${MAX_USERNAME} caracteres.`;
  }
  if (!FORMATO.test(username)) {
    return "O nome de usuário só pode ter letras, números e os sinais . _ - @";
  }
  return null;
}
