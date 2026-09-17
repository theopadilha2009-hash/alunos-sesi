/**
 * Ordenação da vitrine.
 *
 * O desempate é determinístico de propósito: dois alunos com a mesma
 * contagem de estrelas não podem trocar de lugar entre dois renders, senão
 * a lista "pula" na frente de quem está olhando. O `localeCompare` com
 * `sensitivity: "base"` resolve acento sem precisar do fold da busca.
 *
 * Sem imports de propósito: testado direto pelo `node --test`.
 */

export type Ranqueavel = {
  id: string;
  nome: string;
  fixado: boolean;
  destaque: boolean;
  estrelas: number;
};

function porNome(a: { nome: string; id: string }, b: { nome: string; id: string }) {
  const n = a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
  return n !== 0 ? n : a.id.localeCompare(b.id);
}

/**
 * Fixado manda em tudo, depois destaque do ADM, depois estrelas da turma.
 * Empate cai no nome.
 */
export function ordenarAlunos<T extends Ranqueavel>(alunos: T[]): T[] {
  return [...alunos].sort((a, b) => {
    if (a.fixado !== b.fixado) return a.fixado ? -1 : 1;
    if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
    if (a.estrelas !== b.estrelas) return b.estrelas - a.estrelas;
    return porNome(a, b);
  });
}

export type SalaRanqueavel = {
  id: string;
  nome: string;
  alunos: number;
  estrelas: number;
  completude: number;
};

/** Ranking entre salas: estrelas, depois quão completa a sala está. */
export function rankingSalas<T extends SalaRanqueavel>(salas: T[]): T[] {
  return [...salas].sort((a, b) => {
    if (a.estrelas !== b.estrelas) return b.estrelas - a.estrelas;
    if (a.completude !== b.completude) return b.completude - a.completude;
    if (a.alunos !== b.alunos) return b.alunos - a.alunos;
    return porNome(a, b);
  });
}
