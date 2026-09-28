/**
 * Regras de publicação de desafio, fora da Server Action para poderem ser
 * testadas — a action só lê o formulário, valida aqui e chama o banco.
 *
 * O ponto delicado é o formato dos critérios: eles nascem de um `<textarea>`
 * com um por linha e viram `string[]` dentro do jsonb. O banco só exige que
 * seja um array (`desafios_criterios_forma`), então uma linha em branco
 * entraria como item vazio na lista que o aluno lê no card.
 */

export const MAX_CRITERIOS = 8;
export const MAX_TITULO = 80;
export const MAX_SUBTITULO = 140;
export const MAX_DESCRICAO = 600;
export const MAX_RECOMPENSA = 80;
/**
 * `desafios.prazo` é `text`, não `date` (dívida registrada na 004): o banco não
 * limita nem valida o formato, então o teto tem que vir daqui. Cabe "10/11/2026"
 * e "até o fim do bimestre".
 */
export const MAX_PRAZO = 40;

/** As mesmas do tipo `DesafioHackathon` — o card filtra por elas. */
export const CATEGORIAS = [
  "Robótica FLL",
  "Desenvolvimento Web",
  "Inteligência Artificial",
  "Automação IoT",
  "Design & UI/UX",
] as const;

export type CategoriaDesafio = (typeof CATEGORIAS)[number];

/** Uma linha por critério, sem linha vazia e com teto — o card do aluno lê isto. */
export function parseCriterios(bruto: string): string[] {
  return String(bruto ?? "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(0, MAX_CRITERIOS);
}

export type DesafioNovo = {
  titulo: string;
  subtitulo: string;
  categoria: string;
  prazo: string;
  recompensa: string;
  descricao: string;
  criterios: string[];
};

/**
 * O primeiro problema do desafio, ou `null` se estiver publicável.
 *
 * Mesma forma do `problemaDaSenha` em `auth.ts`: quem chama devolve a frase
 * ao ADM direto, sem traduzir código de erro do banco.
 */
export function problemaDoDesafio(d: DesafioNovo): string | null {
  if (!d.titulo) return "Dê um título ao desafio.";
  if (d.titulo.length > MAX_TITULO) return `O título passa de ${MAX_TITULO} caracteres.`;
  if (!d.subtitulo) return "Escreva o subtítulo que aparece no card.";
  if (d.subtitulo.length > MAX_SUBTITULO)
    return `O subtítulo passa de ${MAX_SUBTITULO} caracteres.`;
  if (!CATEGORIAS.includes(d.categoria as CategoriaDesafio)) {
    return "Escolha uma das categorias do mural.";
  }
  if (!d.prazo) return "Informe o prazo que aparece no card.";
  if (d.prazo.length > MAX_PRAZO) return `O prazo passa de ${MAX_PRAZO} caracteres.`;
  if (!d.recompensa) return "Diga qual é a recompensa do desafio.";
  if (d.recompensa.length > MAX_RECOMPENSA)
    return `A recompensa passa de ${MAX_RECOMPENSA} caracteres.`;
  if (!d.descricao) return "Descreva o desafio.";
  if (d.descricao.length > MAX_DESCRICAO)
    return `A descrição passa de ${MAX_DESCRICAO} caracteres.`;
  if (d.criterios.length === 0) return "Liste pelo menos um critério de avaliação.";
  return null;
}
