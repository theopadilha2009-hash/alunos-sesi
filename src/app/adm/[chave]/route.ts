import { NextResponse, type NextRequest } from "next/server";
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
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/adm/[chave]">,
) {
  const { chave } = await ctx.params;

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
