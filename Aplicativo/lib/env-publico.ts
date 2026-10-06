// Variáveis públicas (NEXT_PUBLIC_*): referenciadas literalmente para o Next incluí-las no build.
// Usadas também no proxy, que não pode importar módulos "server-only".
export function envPublico() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseChave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!siteUrl || !supabaseUrl || !supabaseChave) {
    throw new Error(
      "Configuração pública ausente: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
  return { siteUrl: siteUrl.replace(/\/$/, ""), supabaseUrl, supabaseChave };
}
