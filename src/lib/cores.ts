/**
 * A cor de cada sala.
 *
 * Vem das quatro cores do símbolo do SESI, e é atribuída por hash do nome —
 * então "3ºA" é sempre a mesma cor, em qualquer máquina e em qualquer
 * render, sem precisar guardar isso no banco.
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

export function corDaSala(nome: string): string {
  let h = 0;
  for (const ch of String(nome ?? "")) {
    h = (h * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  }
  return CORES_SALA[h % CORES_SALA.length];
}
