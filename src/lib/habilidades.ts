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
 */
export function habilidadePermitida(nome: unknown): nome is string {
  return typeof nome === "string" && LISTA_HABILIDADES.some((h) => h.nome === nome);
}
