import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role — ATRAVESSA a RLS.
 *
 * Só pode ser importado de código que roda no servidor, e só depois de
 * checar o crachá do ADM (`crachaValido`). Se isto chegar ao browser, a
 * chave entrega o banco inteiro: nunca importe daqui em componente
 * "use client", e nunca devolva o resultado cru desta função para o cliente.
 */
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
