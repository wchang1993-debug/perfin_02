import "server-only";
import type { UsuarioAdmin } from "@/lib/auth/sessao";
import { exportarXlsx, garantirPasta, MIME_XLSX, moverParaPasta } from "@/lib/google/drive";
import { criarRascunho } from "@/lib/google/gmail";
import { criarPlanilha } from "@/lib/google/planilhas";
import { obterAccessToken } from "@/lib/google/tokens";
import { formatarMes } from "@/lib/formatacao";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";
import { corpoEmail, montarAbas, statusDoRelatorio, tituloRelatorio } from "./conteudo";
import { temDadosAnbima } from "./conteudo-mercado";
import { coletarDadosRelatorio } from "./dados";

export const NOME_PASTA_DRIVE = "Portal Perfin — Relatórios";

export interface RelatorioRegistrado {
  id: string;
  mes_referencia: string;
  status: "completo" | "preliminar";
  planilha_id: string;
  planilha_url: string;
  criado_em: string;
}

export async function gerarRelatorioDoMes(usuario: UsuarioAdmin, mes: string): Promise<RelatorioRegistrado> {
  const dados = await coletarDadosRelatorio(mes);
  const accessToken = await obterAccessToken(usuario.id);
  const planilha = await criarPlanilha(accessToken, tituloRelatorio(mes), montarAbas(dados));
  const pasta = await garantirPasta(accessToken, NOME_PASTA_DRIVE);
  await moverParaPasta(accessToken, planilha.id, pasta);

  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase
    .from("relatorios")
    .insert({
      user_id: usuario.id,
      mes_referencia: mes,
      status: statusDoRelatorio(dados.resumo).status,
      planilha_id: planilha.id,
      planilha_url: planilha.url,
    })
    .select()
    .single();
  if (error) {
    console.error(`[relatorios] falha ao registrar: ${error.code ?? ""} ${error.message}`);
    throw new Error("A planilha foi criada, mas não foi possível registrá-la no Portal.");
  }
  return data as RelatorioRegistrado;
}

// Lido com a sessão do usuário: o RLS só devolve relatórios do próprio admin.
export async function buscarRelatorio(id: string): Promise<RelatorioRegistrado | null> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase.from("relatorios").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o relatório.");
  return data as RelatorioRegistrado | null;
}

export async function listarRelatorios(): Promise<RelatorioRegistrado[]> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase
    .from("relatorios")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(24);
  if (error) throw new Error("Não foi possível carregar os relatórios.");
  return data as RelatorioRegistrado[];
}

export function nomeArquivoXlsx(mes: string): string {
  return `relatorio-indicadores-${mes.slice(0, 7)}.xlsx`;
}

export async function baixarXlsx(usuario: UsuarioAdmin, relatorio: RelatorioRegistrado): Promise<ArrayBuffer> {
  return exportarXlsx(await obterAccessToken(usuario.id), relatorio.planilha_id);
}

export async function criarRascunhoDoRelatorio(
  usuario: UsuarioAdmin,
  relatorio: RelatorioRegistrado,
  destinatario?: string,
): Promise<string> {
  const accessToken = await obterAccessToken(usuario.id);
  const [xlsx, dados] = await Promise.all([
    exportarXlsx(accessToken, relatorio.planilha_id),
    coletarDadosRelatorio(relatorio.mes_referencia),
  ]);
  const rascunho = await criarRascunho(accessToken, {
    para: destinatario,
    assunto: `Indicadores econômicos — ${formatarMes(relatorio.mes_referencia)} | Perfin Wealth Management`,
    corpoTexto: corpoEmail({
      mes: relatorio.mes_referencia,
      destaques: dados.destaques,
      urlPlanilha: relatorio.planilha_url,
      comAnbima: temDadosAnbima(dados.mercado),
    }),
    anexo: { nome: nomeArquivoXlsx(relatorio.mes_referencia), mime: MIME_XLSX, conteudo: Buffer.from(xlsx) },
  });
  return rascunho.id;
}
