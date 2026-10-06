"use server";

import { redirect } from "next/navigation";
import { ESCOPOS_GOOGLE } from "@/lib/auth/escopos";
import { envPublico } from "@/lib/env-publico";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";

// Inicia o OAuth do Google pelo Supabase. access_type=offline + prompt=consent garantem
// o refresh token usado depois para Agenda, Drive, Planilhas e Gmail.
export async function entrarComGoogle(): Promise<void> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${envPublico().siteUrl}/auth/callback`,
      scopes: ESCOPOS_GOOGLE.join(" "),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) {
    console.error(`[login] falha ao iniciar OAuth: ${error?.message ?? "sem URL"}`);
    redirect("/login?erro=inicio");
  }
  redirect(data.url);
}
