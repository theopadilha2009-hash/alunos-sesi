import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de leitura da vitrine.
 *
 * Usa a anon key de propósito: toda leitura pública passa pela RLS, então
 * uma policy errada aparece aqui em vez de ficar escondida atrás do
 * service_role. Sem sessão e sem persistência — isto não é login.
 */
export function clientePublico() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "alunos-sesi/vitrine" } },
  });
}
