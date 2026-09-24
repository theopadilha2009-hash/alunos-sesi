import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { CSP_HEADER, NONCE_HEADER, montarCsp } from "@/lib/csp";
import {
  COOKIE_VISITANTE,
  UM_ANO,
  abrirAssinado,
  assinar,
  novoVisitante,
  opcoesCookie,
} from "@/lib/sessao";

/**
 * Duas responsabilidades, uma passada só:
 *
 * 1. Dá a cada navegador um id anônimo assinado, que é o que sustenta o
 *    "1 estrela por pessoa". O id nunca vem do cliente — é gerado aqui e vai
 *    assinado, então ninguém consegue votar 50 vezes trocando um número no
 *    DevTools.
 * 2. Monta a CSP com um nonce novo por requisição.
 *
 * Este é o único lugar do projeto que gera nonce, então é o único lugar onde a
 * política pode existir. A CSP que ficava no `next.config.ts` foi removida no
 * mesmo commit: dois headers `Content-Security-Policy` na mesma resposta não se
 * somam, o navegador aplica a interseção — e o sintoma seria "mexi na política
 * e nada mudou".
 *
 * No Next 16 este arquivo se chama `proxy.ts` (o antigo `middleware.ts`) e
 * roda no runtime Node por padrão, que é o que permite usar `node:crypto`.
 */
export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64url");
  const dev = process.env.NODE_ENV !== "production";
  const politica = montarCsp(nonce, dev);

  const cabecalhos = new Headers(request.headers);
  cabecalhos.set(NONCE_HEADER, nonce);
  // O Next lê o nonce daqui — do header de REQUEST — para carimbar os próprios
  // scripts inline de hidratação (getScriptNonceFromHeader, no core dele,
  // procura o primeiro 'nonce-…' em script-src). Sem esta linha, só o script
  // do tema teria nonce e o resto da página não hidrataria.
  cabecalhos.set(CSP_HEADER, politica);

  const resposta = NextResponse.next({ request: { headers: cabecalhos } });
  resposta.headers.set(CSP_HEADER, politica);

  try {
    const atual = request.cookies.get(COOKIE_VISITANTE)?.value;
    if (!abrirAssinado(atual, "visitante")) {
      resposta.cookies.set(
        COOKIE_VISITANTE,
        assinar(novoVisitante(), "visitante"),
        opcoesCookie(UM_ANO),
      );
    }
  } catch (erro) {
    // Sem SESSAO_SEGREDO não dá para assinar. A vitrine continua de pé, com a
    // CSP aplicada e só o voto sem identidade; o login falha alto, que é onde
    // o erro de configuração precisa aparecer.
    console.error("[proxy] não consegui assinar o cookie do visitante:", erro);
  }

  return resposta;
}

export const config = {
  matcher: [
    /*
     * Fora do matcher: assets estáticos, a otimização de imagem do Next e o
     * favicon — nada disso precisa de CSP (e o Next recomenda excluir).
     *
     * `missing` corta os prefetch do `next/link`: são requisições do próprio
     * roteador, não navegação, e gerar nonce para elas só gasta requisição.
     */
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
