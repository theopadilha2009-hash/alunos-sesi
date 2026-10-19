import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logger } from "@/lib/debug";
import { alunoPorSlug, registrarVisita } from "@/lib/dados";
import { limitar } from "@/lib/rate-limit";
import { COOKIE_VISITANTE, abrirAssinado } from "@/lib/sessao";

/**
 * Marca uma visita de perfil. Telemetria: a resposta é **204** quando nada
 * foi gravado (sem cookie, rate limit, slug ruim, aluno pendente) e **201**
 * com `{"contou":true}` quando a visita entrou — é o perfil que soma +1 no
 * contador da tela, porque a página já renderizou com o total ANTES desta
 * visita (o servidor roda primeiro). Erro de banco segue 204 com log: um 5xx
 * aqui viraria erro no console do aluno por nada.
 *
 * A visita vem do cookie anônimo assinado (o mesmo das estrelas), não do
 * corpo: o corpo só diz o slug. Sem cookie válido não há o que contar.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const jar = await cookies();
    const visitante = abrirAssinado(jar.get(COOKIE_VISITANTE)?.value, "visitante");
    if (!visitante || !/^[a-f0-9]{32}$/.test(visitante)) {
      return new NextResponse(null, { status: 204 });
    }

    // O carregamento do perfil é 1 chamada; 30/min já cobre recargas nervosas
    // e não deixa um visitante inflar o log do rate limiter.
    const limite = await limitar(`visita:${visitante}`, 30, 60 * 1000);
    if (!limite.permitido) {
      return new NextResponse(null, { status: 204 });
    }

    const corpo = (await request.json().catch(() => null)) as { slug?: unknown } | null;
    const slug = typeof corpo?.slug === "string" ? corpo.slug : "";
    if (!slug || slug.length > 80) {
      return new NextResponse(null, { status: 204 });
    }

    const aluno = await alunoPorSlug(slug);
    // Pendente de moderação não conta visita: para quem está de fora ele
    // nem existe (a página dá 404), então a visita também não.
    if (!aluno || !aluno.aprovado) {
      return new NextResponse(null, { status: 204 });
    }

    const contou = await registrarVisita(aluno.id, visitante);
    // Recarregar no mesmo dia não conta de novo (a PK cuida disso) e não
    // soma na tela: o 201 é só para a visita que entrou de verdade.
    if (contou) {
      return NextResponse.json({ contou: true }, { status: 201 });
    }
  } catch (erro) {
    logger.error("VISITA", "Falha ao registrar a visita", erro);
  }
  return new NextResponse(null, { status: 204 });
}
