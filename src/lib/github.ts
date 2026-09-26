/**
 * Apresentação de um repositório do GitHub na tela do editor.
 *
 * Sem imports de propósito: este módulo é consumido por um client component (o
 * formulário), e `seguranca.ts` — onde mora o sanitizador da resposta do GitHub
 * — importa `node:crypto`. O que é puro fica aqui; o que lê dado de terceiro
 * fica lá. Testado direto pelo `node --test`.
 */

export type RepoGithub = {
  id: number;
  nome: string;
  descricao: string;
  url: string;
  linguagem: string | null;
  estrelas: number;
  atualizadoEm: string;
};

/**
 * `robo-seguidor-de-linha` vira `Robo seguidor de linha`.
 *
 * O nome do repositório é identificador, não frase — no card do portfólio ele
 * aparece para quem visita, e a forma crua com hífens parece descuido. O aluno
 * pode editar o título depois; isto é só o ponto de partida.
 */
export function tituloDoRepo(nome: string): string {
  const limpo = nome.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  const humanizado = limpo.charAt(0).toUpperCase() + limpo.slice(1);
  return humanizado.slice(0, 80);
}

/**
 * Descrição do repositório; quando não há, o que se sabe dele.
 *
 * Muita gente não escreve descrição no GitHub, e um card com o campo vazio fica
 * com cara de dado faltando. A linguagem é o que o próprio repositório afirma
 * sobre si.
 */
export function descricaoDoRepo(r: Pick<RepoGithub, "descricao" | "linguagem">): string {
  if (r.descricao) return r.descricao.slice(0, 200);
  return r.linguagem ? `Projeto em ${r.linguagem}.` : "";
}

/** `2026-03-14T10:22:31Z` → `14/03/2026`. `null` quando não veio data válida. */
export function quandoDoRepo(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("pt-BR");
}
