import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Sessão e identidade anônima.
 *
 * Dois cookies, os dois assinados com o mesmo segredo (`ADM_CHAVE`):
 *
 * - `sesi.visitante` guarda um id aleatório e é o que dá o "1 estrela por
 *   pessoa". Como ele é httpOnly e assinado, o navegador não consegue
 *   forjar nem escolher o próprio id — a contagem não depende da boa
 *   vontade do cliente.
 * - `sesi.adm` é o crachá do painel. Ele NÃO guarda a chave: guarda um
 *   HMAC dela. Então trocar `ADM_CHAVE` invalida todos os crachás
 *   sozinho, e um crachá vazado não entrega a chave.
 *
 * Só roda no servidor: `node:crypto` não existe no browser.
 */

export const COOKIE_VISITANTE = "sesi.visitante";
export const COOKIE_ADM = "sesi.adm";

const MARCA_ADM = "adm-v1";

export function segredo(): string {
  const s = process.env.ADM_CHAVE;
  if (!s) {
    throw new Error(
      "ADM_CHAVE não configurada — sem ela não dá para assinar sessão.",
    );
  }
  return s;
}

function hmac(valor: string): string {
  return createHmac("sha256", segredo()).update(valor).digest("hex");
}

/** 32 caracteres hexadecimais — mesmo formato da CHECK em public.votos. */
export function novoVisitante(): string {
  return randomBytes(16).toString("hex");
}

export function assinar(valor: string): string {
  return `${valor}.${hmac(valor)}`;
}

/** Devolve o valor original, ou null se a assinatura não confere. */
export function abrirAssinado(token: string | undefined | null): string | null {
  if (!token) return null;
  const corte = token.lastIndexOf(".");
  if (corte <= 0) return null;
  const esperado = assinar(token.slice(0, corte));
  if (esperado.length !== token.length) return null;
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(token))
    ? token.slice(0, corte)
    : null;
}

export function crachaAdm(): string {
  return assinar(MARCA_ADM);
}

export function crachaValido(token: string | undefined | null): boolean {
  return abrirAssinado(token) === MARCA_ADM;
}

/** Compara a chave da URL com a do ambiente em tempo constante. */
export function chaveValida(chave: string | undefined | null): boolean {
  const alvo = process.env.ADM_CHAVE;
  if (!alvo || !chave) return false;
  const a = Buffer.from(chave);
  const b = Buffer.from(alvo);
  // timingSafeEqual lança se os tamanhos diferem; o tamanho não é segredo.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Atributos dos dois cookies. `secure` fica de fora em dev (http). */
export function opcoesCookie(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export const UM_ANO = 60 * 60 * 24 * 365;
export const TRINTA_DIAS = 60 * 60 * 24 * 30;
