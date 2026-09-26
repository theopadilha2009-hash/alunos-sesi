import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { logger } from "@/lib/debug";
import { limitar } from "@/lib/rate-limit";
import { COOKIE_VISITANTE, abrirAssinado } from "@/lib/sessao";
import { clienteAdmin } from "@/lib/supabase/admin";

/**
 * O voto anônimo.
 *
 * Quem vota é ESTA rota, não o browser: `public.votos` não tem policy
 * nenhuma, então nem ler o anon consegue. A identidade vem do cookie
 * assinado — nunca do corpo do request, que é justamente por onde alguém
 * tentaria forjar 50 votos.
 */

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function visitanteAtual(): Promise<string | null> {
  const jar = await cookies();
  return abrirAssinado(jar.get(COOKIE_VISITANTE)?.value, "visitante");
}

async function lerAlunoId(request: Request): Promise<string | null> {
  const corpo = (await request.json().catch(() => null)) as
    | { alunoId?: unknown }
    | null;
  const id = corpo?.alunoId;
  return typeof id === "string" && RE_UUID.test(id) ? id : null;
}

async function contarEstrelas(alunoId: string): Promise<number> {
  const { data } = await clienteAdmin()
    .from("alunos")
    .select("estrelas")
    .eq("id", alunoId)
    .maybeSingle();
  return (data?.estrelas as number) ?? 0;
}

/**
 * Só perfil aprovado recebe estrela.
 *
 * A página de um pendente dá 404, então o botão não está lá para ser clicado —
 * mas esta rota aceita o `alunoId` do corpo do request, e quem já viu o id
 * (ou o guardou de antes da moderação) votaria num perfil que ninguém deveria
 * estar vendo. O 404 espelha o da página: para quem está de fora, não existe.
 */
async function alunoVisivel(alunoId: string): Promise<boolean> {
  const { data } = await clienteAdmin()
    .from("alunos")
    .select("aprovado")
    .eq("id", alunoId)
    .maybeSingle();
  return data?.aprovado === true;
}

export async function POST(request: Request) {
  const visitante = await visitanteAtual();
  if (!visitante) {
    return NextResponse.json(
      { erro: "Sem identidade de visitante — recarregue a página." },
      { status: 400 },
    );
  }

  // Rate limit: máx 30 ações de voto por minuto por visitante
  const limit = await limitar(`voto:${visitante}`, 30, 60 * 1000);
  if (!limit.permitido) {
    return NextResponse.json(
      { erro: "Muitos votos em pouco tempo. Aguarde alguns instantes." },
      { status: 429 },
    );
  }

  const alunoId = await lerAlunoId(request);
  if (!alunoId) {
    return NextResponse.json({ erro: "Aluno inválido." }, { status: 400 });
  }

  if (!(await alunoVisivel(alunoId))) {
    return NextResponse.json({ erro: "Perfil não disponível." }, { status: 404 });
  }

  // ignoreDuplicates = `on conflict do nothing`: quem já votou não insere de
  // novo, e como nenhuma linha entra, o trigger do contador não dispara.
  const { error } = await clienteAdmin()
    .from("votos")
    .upsert(
      { aluno_id: alunoId, visitante_id: visitante },
      { onConflict: "aluno_id,visitante_id", ignoreDuplicates: true },
    );

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    estrelas: await contarEstrelas(alunoId),
    votado: true,
  });
}

export async function DELETE(request: Request) {
  const visitante = await visitanteAtual();
  if (!visitante) {
    return NextResponse.json(
      { erro: "Sem identidade de visitante — recarregue a página." },
      { status: 400 },
    );
  }

  // Rate limit: máx 30 ações de voto por minuto por visitante
  const limit = await limitar(`voto:${visitante}`, 30, 60 * 1000);
  if (!limit.permitido) {
    return NextResponse.json(
      { erro: "Muitos votos em pouco tempo. Aguarde alguns instantes." },
      { status: 429 },
    );
  }

  const alunoId = await lerAlunoId(request);
  if (!alunoId) {
    return NextResponse.json({ erro: "Aluno inválido." }, { status: 400 });
  }

  const { error } = await clienteAdmin()
    .from("votos")
    .delete()
    .eq("aluno_id", alunoId)
    .eq("visitante_id", visitante);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    estrelas: await contarEstrelas(alunoId),
    votado: false,
  });
}
