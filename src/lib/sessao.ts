import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Sessão e identidade anônima.
 *
 * Três cookies são assinados aqui, e cada um tem o seu próprio domínio de
 * assinatura (`Proposito`): trocar o `sesi.adm` de um lugar para o outro não
 * produz um token válido, porque as chaves vêm de subchaves HKDF diferentes.
 *
 * - `sesi.visitante` guarda um id aleatório e é o que dá o "1 estrela por
 *   pessoa". Como ele é httpOnly e assinado, o navegador não consegue
 *   forjar nem escolher o próprio id — a contagem não depende da boa
 *   vontade do cliente.
 * - `sesi.adm` é o crachá do painel. Ele NÃO guarda a chave: guarda um
 *   HMAC dela. Então trocar o segredo invalida todos os crachás sozinho, e
 *   um crachá vazado não entrega a chave.
 * - `sesi.usuario` é o token de login (montado em `auth.ts`).
 *
 * O segredo mestre é `SESSAO_SEGREDO`, **separado** do `ADM_CHAVE`. Antes os
 * dois papéis eram a mesma string: como o `role` viaja dentro do token
 * assinado, quem descobrisse a chave do link `/adm/<chave>` (que passa por log
 * de acesso e histórico de navegador) forjava uma sessão `super_adm` sem
 * nunca ver o link. Agora `ADM_CHAVE` serve só ao link.
 *
 * Só roda no servidor: `node:crypto` não existe no browser.
 */

export const COOKIE_VISITANTE = "sesi.visitante";
export const COOKIE_ADM = "sesi.adm";

const MARCA_ADM = "adm-v1";

/** Domínios de assinatura. Um não se reproduz como outro. */
export type Proposito = "visitante" | "adm" | "usuario";

const SALT_HKDF = "sesi-sessao-v1";

export function segredo(): string {
  const s = process.env.SESSAO_SEGREDO;
  if (!s) {
    throw new Error(
      "SESSAO_SEGREDO não configurada — sem ela não dá para assinar sessão.",
    );
  }
  return s;
}

/**
 * Subchave de 32 bytes para um propósito.
 *
 * HKDF em vez de concatenar o propósito ao segredo: concatenar daria chaves
 * correlacionadas, e um HMAC-SHA256 com a mesma chave usada em dois contextos
 * é o tipo de detalhe que vira ataque anos depois.
 */
function chaveDe(proposito: Proposito): Buffer {
  return Buffer.from(
    hkdfSync("sha256", segredo(), SALT_HKDF, `sesi.${proposito}`, 32),
  );
}

function hmac(valor: string, proposito: Proposito): string {
  return createHmac("sha256", chaveDe(proposito)).update(valor).digest("hex");
}

/** 32 caracteres hexadecimais — mesmo formato da CHECK em public.votos. */
export function novoVisitante(): string {
  return randomBytes(16).toString("hex");
}

export function assinar(valor: string, proposito: Proposito): string {
  return `${valor}.${hmac(valor, proposito)}`;
}

/** Devolve o valor original, ou null se a assinatura não confere. */
export function abrirAssinado(
  token: string | undefined | null,
  proposito: Proposito,
): string | null {
  if (!token) return null;
  const corte = token.lastIndexOf(".");
  if (corte <= 0) return null;
  const esperado = assinar(token.slice(0, corte), proposito);
  if (esperado.length !== token.length) return null;
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(token))
    ? token.slice(0, corte)
    : null;
}

export function crachaAdm(): string {
  return assinar(MARCA_ADM, "adm");
}

export function crachaValido(token: string | undefined | null): boolean {
  return abrirAssinado(token, "adm") === MARCA_ADM;
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
