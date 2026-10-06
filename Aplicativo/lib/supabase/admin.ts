import "server-only";
import { createClient } from "@supabase/supabase-js";
import { envServidor } from "@/lib/env";

// Cliente com a secret key: ignora o RLS. Usar só para operações que o usuário não pode
// fazer por si (credenciais Google, espelho de administradores, remoção de não autorizados).
export function clienteSupabaseAdmin() {
  const env = envServidor();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
