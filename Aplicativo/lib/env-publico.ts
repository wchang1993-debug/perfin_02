import { normalizarUrlSite } from "./url-site";

// Variáveis públicas (NEXT_PUBLIC_*): referenciadas literalmente para o Next incluí-las no build.
// Usadas também no proxy, que não pode importar módulos "server-only".
export function envPublico() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseChave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseChave) {
    throw new Error("Configuração pública ausente: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  return { siteUrl: normalizarUrlSite(process.env.NEXT_PUBLIC_SITE_URL), supabaseUrl, supabaseChave };
}
