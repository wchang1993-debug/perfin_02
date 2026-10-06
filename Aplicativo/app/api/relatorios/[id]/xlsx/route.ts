import { NextResponse } from "next/server";
import { z } from "zod";
import { ErroAcesso, obterUsuarioAdmin } from "@/lib/auth/sessao";
import { MIME_XLSX } from "@/lib/google/drive";
import { ErroConexaoGoogleExpirada } from "@/lib/google/cliente";
import { baixarXlsx, buscarRelatorio, nomeArquivoXlsx } from "@/lib/relatorios/gerar";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) return NextResponse.json({ erro: "Relatório inválido." }, { status: 400 });

  try {
    const usuario = await obterUsuarioAdmin();
    const relatorio = await buscarRelatorio(id.data);
    if (!relatorio) return NextResponse.json({ erro: "Relatório não encontrado." }, { status: 404 });
    const conteudo = await baixarXlsx(usuario, relatorio);
    return new NextResponse(conteudo, {
      headers: {
        "Content-Type": MIME_XLSX,
        "Content-Disposition": `attachment; filename="${nomeArquivoXlsx(relatorio.mes_referencia)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (erro) {
    if (erro instanceof ErroAcesso) return NextResponse.json({ erro: erro.message }, { status: 401 });
    if (erro instanceof ErroConexaoGoogleExpirada) return NextResponse.redirect(new URL("/login?erro=google", request.url));
    console.error(`[xlsx] falha: ${erro instanceof Error ? erro.message : "desconhecida"}`);
    return NextResponse.json({ erro: "Não foi possível gerar o arquivo." }, { status: 500 });
  }
}
