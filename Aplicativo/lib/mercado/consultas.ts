import "server-only";
import { ErroConsulta, rpc } from "@/lib/supabase/rpc";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";
import type {
  ComparacaoSpread,
  ComparacaoVertice,
  Deslocamento,
  DesempenhoIndice,
  FonteMercado,
  HistoricoVertices,
  IndiceAnbima,
  MedianaSpread,
  PontoIndice,
  ResumoSpread,
  SpreadDebenture,
  SpreadVarejo,
  TesouroNaData,
  TituloVariacao,
  VariacaoDebenture,
  VerticeChave,
} from "./tipos";

// Consultas de mercado (ANBIMA, Tesouro, B3). Sessão do usuário: o RLS restringe a administradores.

export async function datasMercado(): Promise<Partial<Record<FonteMercado, string>>> {
  const linhas = await rpc<{ fonte: FonteMercado; ultima_data: string | null }[]>("datas_mercado");
  return Object.fromEntries(linhas.filter((l) => l.ultima_data).map((l) => [l.fonte, l.ultima_data]));
}

// Última data com curva publicada até `data` (fechamento do mês no relatório, por exemplo).
export function dataCurvaAnterior(data: string, pregoes = 0): Promise<string | null> {
  return rpc<string | null>("data_curva_anterior", { p_data: data, p_pregoes: pregoes });
}

export function deslocamentoCurvas(data: string): Promise<Deslocamento[]> {
  return rpc<Deslocamento[]>("deslocamento_curvas", { p_data: data });
}

export function curvaCompleta(data: string): Promise<VerticeChave[]> {
  return rpc<VerticeChave[]>("curva_completa", { p_data: data });
}

export function historicoVertices(inicio: string, fim: string): Promise<HistoricoVertices[]> {
  return rpc<HistoricoVertices[]>("historico_vertices", { p_inicio: inicio, p_fim: fim });
}

export function titulosVariacao(data: string): Promise<TituloVariacao[]> {
  return rpc<TituloVariacao[]>("titulos_variacao", { p_data: data });
}

export function spreadVarejo(data: string): Promise<SpreadVarejo[]> {
  return rpc<SpreadVarejo[]>("spread_varejo", { p_data: data });
}

export function resumoSpreads(data: string): Promise<ResumoSpread[]> {
  return rpc<ResumoSpread[]>("resumo_spreads", { p_data: data });
}

export function medianaSpreadsHist(inicio: string, fim: string): Promise<MedianaSpread[]> {
  return rpc<MedianaSpread[]>("mediana_spreads_hist", { p_inicio: inicio, p_fim: fim });
}

export function maioresVariacoesDebentures(data: string, quantidade = 10): Promise<VariacaoDebenture[]> {
  return rpc<VariacaoDebenture[]>("maiores_variacoes_debentures", { p_data: data, p_quantidade: quantidade });
}

// Busca de debêntures por código ou emissor. O termo já chega validado (só letras, números e espaço).
export async function buscarDebentures(data: string, termo: string, limite = 50): Promise<SpreadDebenture[]> {
  const supabase = await clienteSupabaseServidor();
  const padrao = `*${termo.trim().replace(/\s+/g, "*")}*`;
  const { data: linhas, error } = await supabase
    .rpc("spreads_debentures", { p_data: data })
    .or(`codigo.ilike.${padrao},emissor.ilike.${padrao}`)
    .order("codigo")
    .limit(limite);
  if (error) {
    console.error(`[mercado] busca de debêntures falhou: ${error.code ?? ""} ${error.message}`);
    throw new ErroConsulta("as debêntures");
  }
  return linhas as SpreadDebenture[];
}

export async function indicesNaData(data: string): Promise<IndiceAnbima[]> {
  const supabase = await clienteSupabaseServidor();
  const { data: linhas, error } = await supabase.from("indices_anbima").select("*").eq("data", data).order("indice");
  if (error) {
    console.error(`[mercado] índices falharam: ${error.code ?? ""} ${error.message}`);
    throw new ErroConsulta("os índices ANBIMA");
  }
  return linhas as IndiceAnbima[];
}

export function indicesDesempenho(indices: string[], inicio: string, fim: string): Promise<DesempenhoIndice[]> {
  return rpc<DesempenhoIndice[]>("indices_desempenho", { p_indices: indices, p_inicio: inicio, p_fim: fim });
}

export function indicesBase100(indices: string[], inicio: string, fim: string): Promise<PontoIndice[]> {
  return rpc<PontoIndice[]>("indices_base100", { p_indices: indices, p_inicio: inicio, p_fim: fim });
}

// Apoio ao relatório mensal: fechamento do mês contra o mês anterior.
export function ultimaDataMercado(fonte: Exclude<FonteMercado, "b3">, ate: string): Promise<string | null> {
  return rpc<string | null>("ultima_data_mercado", { p_fonte: fonte, p_ate: ate });
}

export function compararVertices(data: string, dataBase: string): Promise<ComparacaoVertice[]> {
  return rpc<ComparacaoVertice[]>("comparar_vertices", { p_data: data, p_data_base: dataBase });
}

export function compararSpreads(data: string, dataBase: string): Promise<ComparacaoSpread[]> {
  return rpc<ComparacaoSpread[]>("comparar_spreads", { p_data: data, p_data_base: dataBase });
}

export function tesouroNaData(ate: string): Promise<TesouroNaData[]> {
  return rpc<TesouroNaData[]>("tesouro_direto_na_data", { p_ate: ate });
}
