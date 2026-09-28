/**
 * Data curta para a tela: `2026-03-14T10:22:31Z` → `14/03/2026`.
 *
 * O fuso é fixo em São Paulo de propósito. Sem ele, `toLocaleDateString` usa o
 * fuso de onde o código roda — o servidor da Vercel está em UTC e o navegador
 * do aluno em UTC-3 —, então um envio feito às 22h apareceria como um dia no
 * HTML do servidor e outro na hidratação, que é o mismatch que o React acusa.
 * O app é de uma escola em Joinville; o fuso não é escolha do visitante.
 */

const FUSO_ESCOLA = "America/Sao_Paulo";

/** `null` quando a string não é data válida — quem chama decide o que mostrar. */
export function dataCurta(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", { timeZone: FUSO_ESCOLA });
}
