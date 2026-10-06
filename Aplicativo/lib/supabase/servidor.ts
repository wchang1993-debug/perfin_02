import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { envPublico } from "@/lib/env-publico";

// Cliente com a sessão do usuário: todas as consultas passam pelo RLS.
export async function clienteSupabaseServidor() {
  // cookies() primeiro: marca a rota como dinâmica (dados por usuário nunca são pré-renderizados).
  const armazenamento = await cookies();
  const { supabaseUrl, supabaseChave } = envPublico();
  return createServerClient(supabaseUrl, supabaseChave, {
    cookies: {
      getAll: () => armazenamento.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => armazenamento.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o proxy renova a sessão nesses casos.
        }
      },
    },
  });
}
