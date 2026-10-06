import { NextResponse } from "next/server";
import { envPublico } from "@/lib/env-publico";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";

export async function POST() {
  const supabase = await clienteSupabaseServidor();
  const { error } = await supabase.auth.signOut();
  if (error) console.error(`[sair] falha ao encerrar sessão: ${error.message}`);
  return NextResponse.redirect(`${envPublico().siteUrl}/login`, { status: 303 });
}
