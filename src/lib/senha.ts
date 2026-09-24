import { createHash, timingSafeEqual } from "node:crypto";
import { hash, parseOptions, verify } from "@node-rs/argon2";

/**
 * Hash e verificação de senha.
 *
 * Módulo folha de propósito: só `node:crypto` e `@node-rs/argon2`, nenhum
 * import relativo. É isso que permite testá-lo direto pelo `node --test`.
 *
 * O formato vive dentro da própria coluna `usuarios.senha_hash`, então trocar
 * de algoritmo não precisa de coluna nova nem de migration de dados:
 *
 *   $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>   argon2id — formato atual
 *   <64 hex>                                       SHA-256 de 1 rodada, legado
 *   !bloqueado                                     sem senha: precisa redefinir
 */

/** Parâmetros atuais. Mínimo recomendado pela OWASP para argon2id. */
export const PARAMS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

/** Salt fixo do esquema antigo. Existe só para migrar; sai depois do lockdown. */
const SALT_LEGADO = "sesi_salt_2026";

const RE_LEGADO = /^[0-9a-f]{64}$/;
const PREFIXO_ARGON2 = "$argon2";
const TAMANHO_MAXIMO_SENHA = 1000;

/** Marca de hash inautenticável: usada para trancar conta sem senha válida. */
export const SENHA_BLOQUEADA = "!bloqueado";

/**
 * Hash argon2id de uma senha que ninguém conhece. Serve só para gastar o mesmo
 * tempo de CPU no ramo "usuário não encontrado" do login — sem isso, a
 * diferença de relógio conta quais usernames existem.
 */
export const HASH_FANTASMA =
  "$argon2id$v=19$m=19456,t=2,p=1$PT3Sp0umX5b8+Zh2uj7JfQ$XQyMdujlDnvJ1GebaKIdCAJUABjTCAnGXUtRdDlpUog";

function ehArgon2(armazenado: string): boolean {
  return armazenado.startsWith(PREFIXO_ARGON2);
}

/** Hash de senha nova. Salt aleatório de 16 bytes, gerado pela própria lib. */
export function hashSenha(senha: string): Promise<string> {
  return hash(senha, PARAMS);
}

export type Verificacao =
  | { ok: true; precisaRehash: boolean }
  | { ok: false; motivo: "formato" | "senha" };

/**
 * Diz se o hash guardado está abaixo da política atual. Síncrono e puro: só lê
 * o prefixo e os parâmetros embutidos.
 */
export function precisaRehash(armazenado: string): boolean {
  if (!ehArgon2(armazenado)) return true;
  try {
    const p = parseOptions(armazenado);
    return p.memoryCost < PARAMS.memoryCost || p.timeCost < PARAMS.timeCost;
  } catch {
    return true;
  }
}

/** Verifica a senha contra o hash guardado, aceitando o formato legado. */
export async function verificarSenha(
  senha: string,
  armazenado: unknown,
): Promise<Verificacao> {
  if (
    typeof armazenado !== "string" ||
    armazenado.length === 0 ||
    armazenado.length > TAMANHO_MAXIMO_SENHA
  ) {
    return { ok: false, motivo: "formato" };
  }

  if (ehArgon2(armazenado)) {
    let confere = false;
    try {
      confere = await verify(armazenado, senha);
    } catch {
      return { ok: false, motivo: "formato" };
    }
    return confere
      ? { ok: true, precisaRehash: precisaRehash(armazenado) }
      : { ok: false, motivo: "senha" };
  }

  if (RE_LEGADO.test(armazenado)) {
    return verificarLegadoSha256(senha, armazenado)
      ? { ok: true, precisaRehash: true }
      : { ok: false, motivo: "senha" };
  }

  // `!bloqueado` e qualquer lixo caem aqui: sem senha válida, não autentica.
  return { ok: false, motivo: "formato" };
}

/**
 * Confere o esquema antigo (SHA-256 de 1 rodada com salt fixo). Existe para o
 * login conseguir migrar quem ainda tem hash legado; sai quando não houver
 * mais nenhum no banco.
 */
export function verificarLegadoSha256(senha: string, armazenado: string): boolean {
  if (!RE_LEGADO.test(armazenado)) return false;
  const esperado = createHash("sha256")
    .update(`${SALT_LEGADO}:${senha}`)
    .digest("hex");
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(armazenado));
}
