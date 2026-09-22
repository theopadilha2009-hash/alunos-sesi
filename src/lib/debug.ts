/**
 * Utilitários de depuração e observabilidade.
 *
 * Fornece logging estruturado com ofuscação automática de segredos
 * e medição de latência em operações críticas (Supabase, Auth).
 */

const CAMPOS_SENSIVEIS = [
  "senha",
  "senha_hash",
  "token",
  "cookie",
  "key",
  "chave",
  "secret",
  "authorization",
  "adm_chave",
  "service_role",
];

/**
 * Mascara campos sensíveis em objetos ou strings antes de logar.
 */
export function mascararSegredos(dado: unknown): unknown {
  if (dado === null || dado === undefined) return dado;

  if (typeof dado === "string") {
    // Se a string parecer um token ou chave longa, ofusca
    if (dado.length > 24 && !dado.includes(" ") && !dado.startsWith("http")) {
      return `${dado.slice(0, 4)}...${dado.slice(-4)}`;
    }
    return dado;
  }

  if (Array.isArray(dado)) {
    return dado.map(mascararSegredos);
  }

  if (typeof dado === "object") {
    const limpo: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dado as Record<string, unknown>)) {
      const chaveMin = k.toLowerCase();
      const ehSensivel = CAMPOS_SENSIVEIS.some((s) => chaveMin.includes(s));
      if (ehSensivel) {
        limpo[k] = "[REDACTED]";
      } else {
        limpo[k] = mascararSegredos(v);
      }
    }
    return limpo;
  }

  return dado;
}

export type NivelLog = "debug" | "info" | "warn" | "error";

export const logger = {
  debug(tag: string, mensagem: string, dados?: unknown) {
    if (process.env.NODE_ENV === "development" || process.env.DEBUG === "true") {
      console.debug(`[DEBUG][${tag}] ${mensagem}`, dados ? mascararSegredos(dados) : "");
    }
  },

  info(tag: string, mensagem: string, dados?: unknown) {
    console.info(`[INFO][${tag}] ${mensagem}`, dados ? mascararSegredos(dados) : "");
  },

  warn(tag: string, mensagem: string, dados?: unknown) {
    console.warn(`[WARN][${tag}] ${mensagem}`, dados ? mascararSegredos(dados) : "");
  },

  error(tag: string, mensagem: string, erro?: unknown) {
    console.error(`[ERRO][${tag}] ${mensagem}`, erro instanceof Error ? erro.message : mascararSegredos(erro));
  },
};

/**
 * Mede a duração de uma operação assíncrona para diagnóstico.
 */
export async function medirOperacao<T>(
  nome: string,
  operacao: () => Promise<T>,
): Promise<{ resultado: T; duracaoMs: number }> {
  const inicio = performance.now();
  try {
    const resultado = await operacao();
    const duracaoMs = Math.round(performance.now() - inicio);
    return { resultado, duracaoMs };
  } catch (erro) {
    const duracaoMs = Math.round(performance.now() - inicio);
    logger.error("PERF", `Falha na operação "${nome}" após ${duracaoMs}ms`, erro);
    throw erro;
  }
}
