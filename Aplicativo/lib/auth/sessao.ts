import "server-only";
import { redirect } from "next/navigation";
import { envServidor } from "@/lib/env";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";
import { ehEmailAdmin, listaAdmins } from "./admin";

export class ErroAcesso extends Error {
  constructor(public readonly motivo: "nao_autenticado" | "nao_autorizado") {
    super(motivo === "nao_autenticado" ? "Sessão expirada. Entre novamente." : "Acesso não autorizado.");
  }
}

export interface UsuarioAdmin {
  id: string;
  email: string;
  nome: string;
}

// Valida a sessão no servidor do Supabase (getUser) e a lista de administradores.
export async function obterUsuarioAdmin(): Promise<UsuarioAdmin> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new ErroAcesso("nao_autenticado");
  const email = data.user.email ?? "";
  if (!ehEmailAdmin(email, listaAdmins(envServidor().ADMIN_EMAILS))) throw new ErroAcesso("nao_autorizado");
  const nome = (data.user.user_metadata?.full_name as string | undefined) ?? email;
  return { id: data.user.id, email, nome };
}

// Para páginas: redireciona em vez de lançar erro.
export async function exigirAdminNaPagina(): Promise<UsuarioAdmin> {
  try {
    return await obterUsuarioAdmin();
  } catch (erro) {
    if (erro instanceof ErroAcesso) {
      redirect(erro.motivo === "nao_autenticado" ? "/login" : "/acesso-nao-autorizado");
    }
    throw erro;
  }
}
