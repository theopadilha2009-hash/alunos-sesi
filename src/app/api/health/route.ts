import { NextResponse } from "next/server";
import { obterSessao } from "@/lib/auth";
import { logger, medirOperacao } from "@/lib/debug";
import { COOKIE_ADM, podeAdmin } from "@/lib/sessao";
import { clientePublico } from "@/lib/supabase/publico";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const inicio = performance.now();
  let dbStatus = "ok";
  let dbLatenciaMs = 0;
  let erroMsg: string | null = null;

  try {
    const { duracaoMs } = await medirOperacao("health-check-db", async () => {
      const { error } = await clientePublico()
        .from("salas")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (error) throw error;
      return true;
    });
    dbLatenciaMs = duracaoMs;
  } catch (err) {
    dbStatus = "erro";
    erroMsg = err instanceof Error ? err.message : "Erro desconhecido";
    logger.error("HEALTH", "Falha de conectividade no banco Supabase", err);
  }

  const jar = await cookies();
  const sessao = await obterSessao();
  // `podeAdmin` e não a disjunção escrita aqui: era a terceira cópia da mesma
  // regra (as outras duas estão em `/adm` e na vitrine), e uma quarta cópia
  // divergiria em silêncio — abrindo ou fechando o diagnóstico para quem não
  // devia. O que sai daqui é memória e versão do processo, então o portão é o
  // mesmo do painel.
  const autorizado = podeAdmin(jar.get(COOKIE_ADM)?.value, sessao?.role);

  const statusGeral = dbStatus === "ok" ? "ok" : "degraded";
  const statusCode = dbStatus === "ok" ? 200 : 503;

  const respostaBasica = {
    status: statusGeral,
    timestamp: new Date().toISOString(),
    latencyMs: Math.round(performance.now() - inicio),
    database: {
      status: dbStatus,
      latencyMs: dbLatenciaMs,
    },
    version: "0.1.0",
  };

  // Se for administrador autenticado, fornece diagnóstico aprofundado
  if (autorizado) {
    const mem = process.memoryUsage();
    return NextResponse.json(
      {
        ...respostaBasica,
        diagnostic: {
          uptimeSeconds: Math.round(process.uptime()),
          nodeVersion: process.version,
          memory: {
            rssMb: Math.round(mem.rss / (1024 * 1024)),
            heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
            heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
          },
          envSanity: {
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasAdmChave: !!process.env.ADM_CHAVE,
          },
          lastError: erroMsg,
        },
      },
      { status: statusCode },
    );
  }

  return NextResponse.json(respostaBasica, { status: statusCode });
}
