import "server-only";
import { envServidor } from "@/lib/env";
import { salvarRefreshToken } from "@/lib/google/tokens";
import { clienteSupabaseAdmin } from "@/lib/supabase/admin";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";
import { ehEmailAdmin, listaAdmins } from "./admin";
import { ESCOPOS_GOOGLE } from "./escopos";

export type ResultadoLogin = "admin" | "nao_autorizado" | "erro";

// Conclui o OAuth: troca o code pela sessão e aplica a regra de acesso.
// Admin: espelha o e-mail em `administradores` (usado pelo RLS) e guarda o refresh token cifrado.
// Não admin: remove o espelho, encerra a sessão e apaga o usuário criado no Auth (minimização de dados).
export async function concluirLogin(code: string): Promise<ResultadoLogin> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || !data.user) {
    console.error(`[callback] troca do code falhou: ${error?.message ?? "sem sessão"}`);
    return "erro";
  }

  const admin = clienteSupabaseAdmin();
  const email = (data.user.email ?? "").toLowerCase();

  if (!ehEmailAdmin(email, listaAdmins(envServidor().ADMIN_EMAILS))) {
    await supabase.auth.signOut();
    await admin.from("administradores").delete().eq("email", email);
    const { error: erroRemocao } = await admin.auth.admin.deleteUser(data.user.id);
    if (erroRemocao) console.error(`[callback] falha ao remover usuário não autorizado: ${erroRemocao.message}`);
    return "nao_autorizado";
  }

  const { error: erroEspelho } = await admin.from("administradores").upsert({ email });
  if (erroEspelho) {
    console.error(`[callback] falha ao registrar administrador: ${erroEspelho.message}`);
    await supabase.auth.signOut();
    return "erro";
  }

  if (data.session.provider_refresh_token) {
    await salvarRefreshToken(data.user.id, data.session.provider_refresh_token, ESCOPOS_GOOGLE);
  } else {
    // Sem refresh token as funções Google pedem novo login; o painel continua funcionando.
    console.warn("[callback] Google não devolveu refresh token");
  }
  return "admin";
}
