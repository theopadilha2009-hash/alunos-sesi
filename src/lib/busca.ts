/**
 * Busca sem acento: "joao" acha "João", "3oa" acha "3ºA".
 *
 * Sem imports de propósito — este módulo é testado direto pelo `node --test`,
 * que não resolve import sem extensão. Mantenha-o folha.
 */

export type Buscavel = {
  nome: string;
  slug?: string | null;
  bio?: string | null;
  github?: string | null;
  linkedin?: string | null;
  sala?: string | null;
};

/** Tira acento e caixa. `\p{M}` são os diacríticos que o NFD separou. */
export function fold(s: unknown): string {
  return (
    String(s ?? "")
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      // "3ºA" é o formato de verdade das salas, e o º (U+00BA) não é
      // decomponível — o NFD acima passa por ele intacto. Aqui ele vira "o"
      // e, junto com o "o" que o pessoal digita por não ter a tecla, some:
      // "3ºA", "3oA" e "3A" precisam ser a mesma busca.
      .replace(/[º°]/g, "o")
      .replace(/ª/g, "a")
      .replace(/(\d)[oa](?=[a-z])/g, "$1")
  );
}

/** Todos os termos precisam aparecer, em qualquer campo. */
export function matches(item: Buscavel, query: string): boolean {
  const q = fold(query).trim();
  if (!q) return true;
  const blob = [
    item.nome,
    item.slug,
    item.bio,
    item.github,
    item.linkedin,
    item.sala,
  ]
    .map(fold)
    .join(" ");
  return q.split(/\s+/).every((parte) => blob.includes(parte));
}

export const TODAS = "Todas";
export const ESTRELADOS = "★";

export type FiltroAluno = {
  id: string;
  salaId: string | null;
  estrelas: number;
} & Buscavel;

/**
 * Filtra por sala e por texto. A sala `★` é o atalho de "quem eu estreei",
 * não uma sala de verdade — por isso ela vem antes do filtro de sala.
 */
export function filtrarAlunos<T extends FiltroAluno>(
  alunos: T[],
  {
    sala = TODAS,
    query = "",
    estrelados = [],
  }: { sala?: string; query?: string; estrelados?: string[] } = {},
): T[] {
  const meus = new Set(estrelados);
  return alunos.filter((a) => {
    if (sala === ESTRELADOS) {
      if (!meus.has(a.id)) return false;
    } else if (sala !== TODAS && a.salaId !== sala) {
      return false;
    }
    return matches(a, query);
  });
}
