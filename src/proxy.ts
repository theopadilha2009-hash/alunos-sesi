import { NextResponse, type NextRequest } from "next/server";
import {
  COOKIE_VISITANTE,
  UM_ANO,
  abrirAssinado,
  assinar,
  novoVisitante,
  opcoesCookie,
} from "@/lib/sessao";

/**
 * Dá a cada navegador um id anônimo assinado, que é o que sustenta o
 * "1 estrela por pessoa".
 *
 * Só faz isso uma vez: se o cookie já existe e a assinatura confere, não
 * toca em nada. O id nunca vem do cliente — é gerado aqui e vai assinado,
 * então ninguém consegue votar 50 vezes trocando um número no DevTools.
 *
 * No Next 16 este arquivo se chama `proxy.ts` (o antigo `middleware.ts`) e
 * roda no runtime Node por padrão, que é o que permite usar `node:crypto`.
 */
export function proxy(request: NextRequest) {
  const atual = request.cookies.get(COOKIE_VISITANTE)?.value;
  if (abrirAssinado(atual)) return NextResponse.next();

  try {
    const resposta = NextResponse.next();
    resposta.cookies.set(
      COOKIE_VISITANTE,
      assinar(novoVisitante()),
      opcoesCookie(UM_ANO),
    );
    return resposta;
  } catch (erro) {
    // Sem ADM_CHAVE não dá para assinar. A vitrine continua de pé (só o
    // voto fica sem identidade); o painel do ADM é quem falha alto.
    console.error("[proxy] não consegui assinar o cookie do visitante:", erro);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)",
  ],
};
