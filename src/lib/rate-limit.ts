import { headers } from "next/headers";
import { logger } from "./debug";
import { resetarRateLimit, verificarRateLimit } from "./seguranca";
import { clienteAdmin } from "./supabase/admin";

/**
 * Rate limit que sobrevive ao cold start.
 *
 * O limitador de `seguranca.ts` é um `Map` em memória: em serverless cada
 * instância nova nasce com ele vazio, então o limite reinicia sozinho e na
 * prática quase não existe. Este módulo passa pelo `checar_rate_limit` do
 * Postgres (src/sql/007_rate_limit.sql), que é atômico e compartilhado por
 * todas as instâncias, e mantém o `Map` como rede de segurança.
 *
 * Módulo de servidor: fala com o Supabase e com `next/headers`.
 */

export type ResultadoLimite = { permitido: boolean; tempoRestanteMs?: number };

/**
 * Conta uma tentativa e diz se ela pode passar.
 *
 * **Fail-open de propósito.** Se o banco não responder, cai no limitador em
 * memória e loga `warn`. Um limitador que derruba o login quando o banco tosse
 * é pior que o problema que ele resolve — o ataque que ele evita é força bruta
 * lenta, e essa o Map ainda pega dentro da mesma instância.
 *
 * `chave` deve levar o domínio no prefixo (`login:joao`, `login-ip:1.2.3.4`):
 * o mesmo namespace é compartilhado por todos os chamadores.
 */
export async function limitar(
  chave: string,
  max: number,
  janelaMs: number,
  bloqueioMs: number = janelaMs,
): Promise<ResultadoLimite> {
  try {
    const { data, error } = await clienteAdmin().rpc("checar_rate_limit", {
      p_chave: chave,
      p_max: max,
      p_janela_ms: janelaMs,
      p_bloqueio_ms: bloqueioMs,
    });

    if (error) throw error;
    return { permitido: data === true };
  } catch (err) {
    logger.warn(
      "RATE",
      `checar_rate_limit indisponível, usando o limitador em memória (${chave})`,
      err,
    );
    return verificarRateLimit(chave, max, janelaMs, bloqueioMs);
  }
}

/**
 * Zera a contagem de uma chave. Chamado quando a ação deu certo — login válido
 * não deve continuar contando para o bloqueio da próxima vez.
 */
export async function limparLimite(chave: string): Promise<void> {
  resetarRateLimit(chave);
  try {
    await clienteAdmin().from("tentativas").delete().eq("chave", chave);
  } catch (err) {
    // Não é motivo para falhar a ação que já deu certo: a linha expira sozinha
    // pela limpeza probabilística da função.
    logger.warn("RATE", `não consegui limpar a chave de rate limit (${chave})`, err);
  }
}

const RE_IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const RE_IPV6 = /^[0-9a-f:]{2,45}$/i;

/**
 * IP do cliente, para o limite por IP.
 *
 * A Vercel escreve `x-forwarded-for` e o cliente real é a PRIMEIRA entrada —
 * as seguintes são proxies da cadeia. O header é do cliente em qualquer setup
 * que não reescreva ele na borda, então isto é defesa em profundidade, não a
 * barreira principal: o limite por usuário continua sendo o que conta.
 *
 * Devolve `null` quando não dá para confiar no valor, e quem chama decide o que
 * fazer — inventar um IP fixo ("desconhecido") faria todo mundo compartilhar o
 * mesmo balde e um atacante derrubaria o login da turma inteira.
 */
export async function ipDoCliente(): Promise<string | null> {
  const cabecalhos = await headers();
  const bruto =
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabecalhos.get("x-real-ip")?.trim() ||
    "";

  if (!bruto || bruto.length > 45) return null;
  return RE_IPV4.test(bruto) || RE_IPV6.test(bruto) ? bruto : null;
}
