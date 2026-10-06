import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ehEmailAdmin, listaAdmins } from "@/lib/auth/admin";
import { envPublico } from "@/lib/env-publico";

const ROTAS_PUBLICAS = ["/login", "/acesso-nao-autorizado", "/auth/callback", "/offline"];

function ehRotaPublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.some((rota) => caminho === rota || caminho.startsWith(`${rota}/`));
}

// Renova a sessão do Supabase (cookies) e faz a checagem otimista de acesso.
// A checagem definitiva acontece de novo em cada página, Server Action e Route Handler.
export async function atualizarSessao(request: NextRequest): Promise<NextResponse> {
  const { supabaseUrl, supabaseChave } = envPublico();
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseChave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, cabecalhos) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
        Object.entries(cabecalhos ?? {}).forEach(([nome, valor]) => resposta.headers.set(nome, valor));
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const caminho = request.nextUrl.pathname;
  if (ehRotaPublica(caminho)) return resposta;

  if (!data.user) return redirecionar(request, "/login");
  if (!ehEmailAdmin(data.user.email, listaAdmins(process.env.ADMIN_EMAILS))) {
    return redirecionar(request, "/acesso-nao-autorizado");
  }
  return resposta;
}

function redirecionar(request: NextRequest, destino: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destino;
  url.search = "";
  return NextResponse.redirect(url);
}
