"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ErroAcesso, obterUsuarioAdmin } from "@/lib/auth/sessao";
import type { EstadoAcao } from "@/lib/estado-acao";
import { ErroConexaoGoogleExpirada } from "@/lib/google/cliente";
import { buscarRelatorio, criarRascunhoDoRelatorio, gerarRelatorioDoMes } from "@/lib/relatorios/gerar";

const esquemaMes = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido");
const esquemaRascunho = z.object({
  relatorioId: z.uuid(),
  destinatario: z.union([z.email(), z.literal("")]).optional(),
});

// Mensagens genéricas para o usuário; o detalhe vai só para o log do servidor.
function tratarErro(erro: unknown, contexto: string): EstadoAcao {
  if (erro instanceof ErroAcesso || erro instanceof ErroConexaoGoogleExpirada) {
    return { ok: false, mensagem: erro.message };
  }
  console.error(`[relatorios] ${contexto}: ${erro instanceof Error ? erro.message : "erro desconhecido"}`);
  return { ok: false, mensagem: `Não foi possível ${contexto}. Tente novamente.` };
}

export async function gerarRelatorio(_anterior: EstadoAcao | null, formulario: FormData): Promise<EstadoAcao> {
  const mes = esquemaMes.safeParse(formulario.get("mes"));
  if (!mes.success) return { ok: false, mensagem: "Escolha um mês válido." };
  try {
    const usuario = await obterUsuarioAdmin();
    const relatorio = await gerarRelatorioDoMes(usuario, `${mes.data}-01`);
    revalidatePath("/relatorios");
    const sufixo = relatorio.status === "preliminar" ? " (preliminar: há indicadores ainda não divulgados)" : "";
    return { ok: true, mensagem: `Relatório gerado${sufixo}.`, url: relatorio.planilha_url };
  } catch (erro) {
    return tratarErro(erro, "gerar o relatório");
  }
}

export async function criarRascunho(_anterior: EstadoAcao | null, formulario: FormData): Promise<EstadoAcao> {
  const entrada = esquemaRascunho.safeParse({
    relatorioId: formulario.get("relatorioId"),
    destinatario: formulario.get("destinatario") ?? "",
  });
  if (!entrada.success) return { ok: false, mensagem: "Destinatário inválido." };
  try {
    const usuario = await obterUsuarioAdmin();
    const relatorio = await buscarRelatorio(entrada.data.relatorioId);
    if (!relatorio) return { ok: false, mensagem: "Relatório não encontrado." };
    await criarRascunhoDoRelatorio(usuario, relatorio, entrada.data.destinatario || undefined);
    return { ok: true, mensagem: "Rascunho criado no seu Gmail. Revise e envie por lá.", url: "https://mail.google.com/mail/u/0/#drafts" };
  } catch (erro) {
    return tratarErro(erro, "criar o rascunho");
  }
}
