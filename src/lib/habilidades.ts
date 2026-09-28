/**
 * Extração inteligente e taxonomia de habilidades e tecnologias para a turma SESI.
 * Analisa palavras-chave em bios e perfis para gerar tags dinâmicas.
 */

export type HabilidadeMeta = {
  nome: string;
  padrao: RegExp;
  cor: string;
  icone?: string;
};

export const LISTA_HABILIDADES: HabilidadeMeta[] = [
  {
    nome: "Robótica",
    padrao: /\b(robotica|fll|ftc|frc|lego|automação|automacao|seguidor de linha|combate)\b/i,
    cor: "#3fc2bc",
  },
  {
    nome: "Python",
    padrao: /\b(python|django|flask|fastapi|pandas|numpy)\b/i,
    cor: "#38b95d",
  },
  {
    nome: "Web Frontend",
    padrao: /\b(react|next\.?js|html|css|vue|angular|frontend|front-end|typescript|javascript)\b/i,
    cor: "#4881ae",
  },
  {
    nome: "Backend & SQL",
    padrao: /\b(node|backend|back-end|sql|postgres|database|banco de dados|api|express|prisma)\b/i,
    cor: "#2d929e",
  },
  {
    nome: "Hardware & IoT",
    padrao: /\b(arduino|esp32|raspberry|iot|eletr[oô]nica|eletrot[eé]cnica|circuitos|solda)\b/i,
    cor: "#f3b544",
  },
  {
    nome: "Design & UI/UX",
    padrao: /\b(figma|design|ui|ux|prototipagem|photoshop|illustrator|wireframe)\b/i,
    cor: "#d74d42",
  },
  {
    nome: "IA & Dados",
    padrao: /\b(ia|intelig[eê]ncia artificial|machine learning|data science|dados|llm|ia generativa)\b/i,
    cor: "#9b51e0",
  },
  {
    nome: "C++ & Embarcados",
    padrao: /\b(c\+\+|embarcados|microcontrolador|assembly|sistemas embarcados)\b/i,
    cor: "#e67e22",
  },
  {
    nome: "Modelagem 3D",
    padrao: /\b(blender|3d|solidworks|impress[aã]o 3d|cad|autocad|fusion 360)\b/i,
    cor: "#e84393",
  },
  {
    nome: "Mobile",
    padrao: /\b(flutter|react native|kotlin|swift|android|ios|mobile)\b/i,
    cor: "#00b894",
  },
];

/** Extrai até 4 habilidades mais relevantes da bio do aluno */
export function extrairHabilidades(bio: string | null | undefined): string[] {
  if (!bio) return [];
  const encontradas: string[] = [];

  for (const hab of LISTA_HABILIDADES) {
    if (hab.padrao.test(bio)) {
      encontradas.push(hab.nome);
      if (encontradas.length >= 4) break;
    }
  }

  return encontradas;
}

/** Retorna a cor associada à habilidade */
export function corHabilidade(nome: string): string {
  const meta = LISTA_HABILIDADES.find((h) => h.nome.toLowerCase() === nome.toLowerCase());
  return meta ? meta.cor : "#3fc2bc";
}

/**
 * Allowlist das habilidades que podem receber endosso.
 *
 * Comparação **exata**, não case-insensitive: a PK de `public.endossos` trata
 * `Python` e `python` como habilidades distintas, então tolerar caixa aqui
 * criaria duas linhas para a mesma competência.
 *
 * Depois que o aluno passou a poder escrever a própria competência, esta função
 * deixou de ser "o que pode existir no perfil" e virou só "o que pode receber
 * +1" — `habilidadeValida` é quem decide a primeira coisa agora.
 */
export function habilidadePermitida(nome: unknown): nome is string {
  return typeof nome === "string" && LISTA_HABILIDADES.some((h) => h.nome === nome);
}

/**
 * Teto do nome de uma competência escrita à mão.
 *
 * 32 cabe em qualquer chip do perfil sem quebrar linha em três, e é folgado
 * para "Machine Learning" (16). O teto existe porque o nome é digitado livre e
 * vai inteiro para o banco — sem ele, um texto colado de 500 caracteres viraria
 * uma competência ilegível que ninguém consegue endossar nem ler.
 */
export const MAX_CARACTERES_HABILIDADE = 32;

/**
 * O nome aceito começa por letra ou número e segue com o que aparece de verdade
 * em competência técnica: espaço, ponto, vírgula, `+ # & ( ) ' - _ /` e acentos.
 *
 * Allowlist, e não uma lista de bloqueio: `<script>` é recusado porque começa
 * com `<`, e não porque alguém lembrou de proibir `<`. Emoji e símbolo solto
 * também caem fora — o campo é competência, não legenda de rede social.
 */
const NOME_HABILIDADE = /^[\p{L}\p{N}][\p{L}\p{N} .,+#&()'\-_/]*$/u;

/**
 * Normaliza o nome digitado no editor de competências.
 *
 * Devolve `null` para o que não pode virar competência: não-string, vazio,
 * acima do teto, caractere de controle ou fora do padrão acima. Espaços
 * internos colapsam ("Web   Frontend" é "Web Frontend"), porque o nome é a
 * chave pela qual a turma compara — duas versões com espaçamento diferente
 * seriam duas competências na tela e nenhuma no endosso.
 */
export function normalizarNomeHabilidade(bruto: unknown): string | null {
  if (typeof bruto !== "string") return null;

  const nome = bruto.replace(/\s+/g, " ").trim();
  if (!nome || nome.length > MAX_CARACTERES_HABILIDADE) return null;
  if (!NOME_HABILIDADE.test(nome)) return null;

  // Quem digita "python" está falando da mesma competência que o chip "Python",
  // e é o "Python" da lista que a turma consegue endossar. Devolver a forma
  // canônica aqui evita o par de chips que só diferem na caixa — em que um
  // recebe +1 e o outro nunca recebe nada, sem o aluno entender por quê.
  const conhecida = LISTA_HABILIDADES.find(
    (h) => h.nome.toLowerCase() === nome.toLowerCase(),
  );
  return conhecida ? conhecida.nome : nome;
}
