import "server-only";
import { clienteSupabaseServidor } from "./servidor";

export class ErroConsulta extends Error {
  constructor(origem: string) {
    super(`Não foi possível carregar ${origem}.`);
  }
}

// Chama uma função SQL com a sessão do usuário (RLS aplicado). Detalhes do erro só no log.
export async function rpc<T>(funcao: string, parametros: Record<string, unknown> = {}): Promise<T> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase.rpc(funcao, parametros);
  if (error) {
    console.error(`[rpc] ${funcao} falhou: ${error.code ?? ""} ${error.message}`);
    throw new ErroConsulta(funcao);
  }
  return data as T;
}
