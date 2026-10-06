import "server-only";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";
import type {
  CodigoIndicador,
  DecisaoCopom,
  EstatisticasCambio,
  IndicadorDesatualizado,
  Ponto,
  Ponto12m,
  PontoBase100,
  Simulacao,
  StatusMeta,
  UltimoValor,
} from "./tipos";

// Todas as consultas usam a sessão do usuário: o RLS garante que só administradores leem.

export class ErroConsulta extends Error {
  constructor(origem: string) {
    super(`Não foi possível carregar ${origem}.`);
  }
}

async function rpc<T>(funcao: string, parametros: Record<string, unknown> = {}): Promise<T> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase.rpc(funcao, parametros);
  if (error) {
    console.error(`[consultas] rpc ${funcao} falhou: ${error.code ?? ""} ${error.message}`);
    throw new ErroConsulta(funcao);
  }
  return data as T;
}

export function ultimosValores(): Promise<UltimoValor[]> {
  return rpc<UltimoValor[]>("ultimos_valores");
}

export async function serie(codigo: CodigoIndicador, inicio: string, fim: string): Promise<Ponto[]> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase
    .from("indicadores_valores")
    .select("data, valor")
    .eq("indicador_codigo", codigo)
    .gte("data", inicio)
    .lte("data", fim)
    .order("data")
    .limit(5000);
  if (error) {
    console.error(`[consultas] série ${codigo} falhou: ${error.code ?? ""} ${error.message}`);
    throw new ErroConsulta(`a série ${codigo}`);
  }
  return data as Ponto[];
}

export function acumuladoPeriodo(codigo: CodigoIndicador, inicio: string, fim: string): Promise<number | null> {
  return rpc<number | null>("acumulado_periodo", { p_codigo: codigo, p_inicio: inicio, p_fim: fim });
}

export function serie12m(codigo: CodigoIndicador, inicio: string, fim: string): Promise<Ponto12m[]> {
  return rpc<Ponto12m[]>("serie_12m", { p_codigo: codigo, p_inicio: inicio, p_fim: fim });
}

export function juroReal12m(mes: string): Promise<number | null> {
  return rpc<number | null>("juro_real_12m", { p_mes: mes });
}

export async function statusMeta(mes: string): Promise<StatusMeta | null> {
  const linhas = await rpc<StatusMeta[]>("status_meta_inflacao", { p_mes: mes });
  return linhas[0] ?? null;
}

export async function estatisticasCambio(
  codigo: CodigoIndicador,
  inicio: string,
  fim: string,
): Promise<EstatisticasCambio | null> {
  const linhas = await rpc<EstatisticasCambio[]>("estatisticas_cambio", { p_codigo: codigo, p_inicio: inicio, p_fim: fim });
  return linhas[0] ?? null;
}

export function decisoesCopom(inicio: string, fim: string): Promise<DecisaoCopom[]> {
  return rpc<DecisaoCopom[]>("decisoes_copom", { p_inicio: inicio, p_fim: fim });
}

export function serieBase100(codigos: CodigoIndicador[], inicio: string, fim: string): Promise<PontoBase100[]> {
  return rpc<PontoBase100[]>("serie_base100", { p_codigos: codigos, p_inicio: inicio, p_fim: fim });
}

export function simulacao10mil(codigos: CodigoIndicador[], inicio: string, fim: string): Promise<Simulacao[]> {
  return rpc<Simulacao[]>("simulacao_10mil", { p_codigos: codigos, p_inicio: inicio, p_fim: fim });
}

export function indicadoresDesatualizados(): Promise<IndicadorDesatualizado[]> {
  return rpc<IndicadorDesatualizado[]>("indicadores_desatualizados");
}
