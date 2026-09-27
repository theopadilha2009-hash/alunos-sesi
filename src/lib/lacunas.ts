import type { AlunoNaTela } from "./tipos.ts";

/**
 * O que falta no perfil do aluno — as lacunas que o ADM consegue atacar.
 *
 * O banco já resume isto: `retrato_salas` conta alunos, com LinkedIn e com
 * GitHub por turma. Mas conta a base inteira e devolve um percentual: o ADM lê
 * "68% de completude" e não sabe quais são os 32%. Aqui a mesma pergunta vira
 * filtro sobre a lista que já está no cliente, então o número do card de sala e
 * as linhas da tabela filtrada nunca divergem.
 *
 * `sem-bio` não entra na conta do banco de propósito. A definição de perfil
 * "completo" que alimenta o ranking público das salas é LinkedIn + GitHub
 * (`001_schema.sql`); incluir a bio aqui mudaria o ranking sem ninguém pedir.
 * As duas coisas são perguntas diferentes: uma é contato, a outra é conteúdo.
 */
export type Lacuna = "sem-linkedin" | "sem-github" | "sem-bio";

/** Os campos que decidem uma lacuna. `Pick` para o teste não montar um aluno inteiro. */
export type Perfil = Pick<AlunoNaTela, "linkedin" | "github" | "bio">;

const COMO_FALTA: Record<Lacuna, (a: Perfil) => boolean> = {
  "sem-linkedin": (a) => !a.linkedin,
  "sem-github": (a) => !a.github,
  // Bio em branco é tão ausente quanto bio nula: o editor deixa o campo
  // preenchido só com espaços e isso não é perfil.
  "sem-bio": (a) => !a.bio?.trim(),
};

/** O rótulo é do card, não do banco — "3 sem LinkedIn", não "3 com_linkedin=0". */
export const ROTULO_LACUNA: Record<Lacuna, string> = {
  "sem-linkedin": "sem LinkedIn",
  "sem-github": "sem GitHub",
  "sem-bio": "sem bio",
};

/** A ordem em que as lacunas aparecem no card. */
export const LACUNAS: Lacuna[] = ["sem-linkedin", "sem-github", "sem-bio"];

export function faltaLacuna(aluno: Perfil, chave: Lacuna): boolean {
  return COMO_FALTA[chave](aluno);
}

export function filtrarPorLacuna<T extends Perfil>(alunos: T[], chave: Lacuna | null): T[] {
  if (!chave) return alunos;
  return alunos.filter((a) => faltaLacuna(a, chave));
}

/** Quantos falta em cada lacuna — o que o card de sala mostra. */
export function contarLacunas(alunos: Perfil[]): { chave: Lacuna; quantos: number }[] {
  return LACUNAS.map((chave) => ({
    chave,
    quantos: alunos.filter((a) => faltaLacuna(a, chave)).length,
  }));
}
