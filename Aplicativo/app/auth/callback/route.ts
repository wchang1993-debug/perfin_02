import { NextResponse, type NextRequest } from "next/server";
import { concluirLogin } from "@/lib/auth/callback";
import { envPublico } from "@/lib/env-publico";

const DESTINOS = {
  admin: "/",
  nao_autorizado: "/acesso-nao-autorizado",
  erro: "/login?erro=callback",
} as const;

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const { siteUrl } = envPublico();
  if (!code) return NextResponse.redirect(`${siteUrl}${DESTINOS.erro}`);

  try {
    const resultado = await concluirLogin(code);
    return NextResponse.redirect(`${siteUrl}${DESTINOS[resultado]}`);
  } catch (erro) {
    console.error(`[callback] erro inesperado: ${erro instanceof Error ? erro.message : "desconhecido"}`);
    return NextResponse.redirect(`${siteUrl}${DESTINOS.erro}`);
  }
}
