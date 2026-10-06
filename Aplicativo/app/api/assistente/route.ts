import { NextResponse } from "next/server";
import { esquemaPergunta, montarContexto } from "@/lib/assistente/contexto";
import { responderEmStream } from "@/lib/assistente/gemini";
import { ErroAcesso, obterUsuarioAdmin } from "@/lib/auth/sessao";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { montarPainel } from "@/lib/indicadores/painel";

export async function POST(request: Request) {
  try {
    await obterUsuarioAdmin();
  } catch (erro) {
    if (erro instanceof ErroAcesso) return NextResponse.json({ erro: erro.message }, { status: 401 });
    throw erro;
  }

  const corpo: unknown = await request.json().catch(() => null);
  const pergunta = esquemaPergunta.safeParse(corpo);
  if (!pergunta.success) return NextResponse.json({ erro: "Pergunta inválida." }, { status: 400 });

  try {
    // O servidor busca de novo os dados do filtro: nada que venha do navegador vira "dado".
    const painel = await montarPainel(lerFiltro(pergunta.data.filtro));
    const fluxo = await responderEmStream(pergunta.data, montarContexto(painel));
    return new Response(fluxo, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  } catch (erro) {
    console.error(`[assistente] falha: ${erro instanceof Error ? erro.message : "desconhecida"}`);
    return NextResponse.json({ erro: "O assistente não está disponível agora. Tente novamente." }, { status: 502 });
  }
}
