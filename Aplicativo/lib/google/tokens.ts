import "server-only";
import { envServidor } from "@/lib/env";
import { clienteSupabaseAdmin } from "@/lib/supabase/admin";
import { cifrar, decifrar } from "./cifra";
import { ErroConexaoGoogleExpirada } from "./cliente";

const URL_TOKEN = "https://oauth2.googleapis.com/token";

export async function salvarRefreshToken(userId: string, refreshToken: string, escopos: readonly string[]) {
  const env = envServidor();
  const { error } = await clienteSupabaseAdmin()
    .from("google_credenciais")
    .upsert({
      user_id: userId,
      refresh_token_cifrado: cifrar(refreshToken, env.GOOGLE_TOKEN_ENCRYPTION_KEY),
      escopos: [...escopos],
      atualizado_em: new Date().toISOString(),
    });
  if (error) throw new Error("Não foi possível salvar a credencial do Google.");
}

// Gera um access token novo a partir do refresh token guardado (cifrado) no banco.
export async function obterAccessToken(userId: string): Promise<string> {
  const env = envServidor();
  const { data, error } = await clienteSupabaseAdmin()
    .from("google_credenciais")
    .select("refresh_token_cifrado")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Não foi possível ler a credencial do Google.");
  if (!data) throw new ErroConexaoGoogleExpirada();

  const resposta = await fetch(URL_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: decifrar(data.refresh_token_cifrado, env.GOOGLE_TOKEN_ENCRYPTION_KEY),
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (resposta.status === 400 || resposta.status === 401) throw new ErroConexaoGoogleExpirada();
  if (!resposta.ok) throw new Error(`Falha ao renovar o acesso ao Google (HTTP ${resposta.status}).`);
  const corpo = (await resposta.json()) as { access_token?: string };
  if (!corpo.access_token) throw new ErroConexaoGoogleExpirada();
  return corpo.access_token;
}
