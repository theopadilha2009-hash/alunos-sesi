/**
 * Slug do perfil — é o que o aluno compartilha, então precisa ser legível
 * ("ana-silva") e nunca colidir. Sem imports de propósito: testado direto.
 */

const MAX = 60;

export function slugificar(nome: string): string {
  const base = String(nome ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX)
    .replace(/-+$/g, "");
  return base.length >= 2 ? base : "aluno";
}

/**
 * Slug livre a partir dos que já existem. O sufixo é numérico e estável
 * (o 2º "Ana Silva" vira "ana-silva-2"), então reimportar a mesma lista
 * tende a reproduzir os mesmos slugs.
 */
export function slugUnico(nome: string, usados: Iterable<string>): string {
  const tomados = new Set(usados);
  const base = slugificar(nome);
  if (!tomados.has(base)) return base;
  for (let n = 2; n < 5000; n++) {
    const candidato = `${base}-${n}`;
    if (!tomados.has(candidato)) return candidato;
  }
  return `${base}-${tomados.size + 1}`;
}
