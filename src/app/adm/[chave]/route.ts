import { NextResponse, type NextRequest } from "next/server";
import { ipDoCliente, limitar } from "@/lib/rate-limit";
import {
  COOKIE_ADM,
  TRINTA_DIAS,
  chaveValida,
  crachaAdm,
  opcoesCookie,
} from "@/lib/sessao";

/**
 * A porta do link secreto: /adm/<ADM_CHAVE>
 *
 * Esta é a única vez que a chave aparece. Ela é conferida aqui e trocada
 * por um cookie httpOnly assinado; o redirect tira a chave da barra de
 * endereço, do histórico e do `Referer` das navegações seguintes.
 *
 * É um Route Handler, e não uma página, de propósito: uma página renderiza
 * e devolve HTML, e a chave ficaria no `Referer` de qualquer recurso que
 * ela carregasse.
 *
 * A resposta de chave errada é 404, não 401: 401 confirmaria que a rota
 * existe e que só falta a senha.
 *
 * Duas travas de rate limit antes de comparar a chave, porque adivinhar a
 * chave é o único caminho de entrar sem senha:
 * - por IP: barra quem tenta muitas de um lugar só;
 * - global: é a única que não depende de o IP ser confiável. `x-forwarded-for`
 *   pode ser forjado em setups que não reescrevem o header na borda, e sem o
 *   balde global bastaria rotacionar o header para tentar sem limite.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/adm/[chave]">,
) {
  const { chave } = await ctx.params;

  const ip = await ipDoCliente();
  if (ip) {
    const porIp = await limitar(`adm-chave:${ip}`, 10, 10 * 60 * 1000, 30 * 60 * 1000);
    const global = await limitar("adm-chave:global", 100, 10 * 60 * 1000, 10 * 60 * 1000);
    if (!porIp.permitido || !global.permitido) {
      return new NextResponse(null, {
        status: 404,
        headers: { "X-Robots-Tag": "noindex, nofollow" },
      });
    }
  }

  if (!chaveValida(chave)) {
    return new NextResponse(null, {
      status: 404,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    });
  }

  const resposta = NextResponse.redirect(new URL("/adm", request.url), 303);
  resposta.cookies.set(COOKIE_ADM, crachaAdm(), opcoesCookie(TRINTA_DIAS));
  resposta.headers.set("X-Robots-Tag", "noindex, nofollow");
  return resposta;
}
