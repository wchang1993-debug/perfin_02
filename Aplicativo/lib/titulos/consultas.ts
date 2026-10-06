import "server-only";
import { clienteSupabaseServidor } from "@/lib/supabase/servidor";

export interface ResumoTesouro {
  titulo: string;
  vencimento: string;
  data: string;
  taxa_compra: number | null;
  taxa_venda: number | null;
  pu_compra: number | null;
  pu_venda: number | null;
  minimo_12m: number | null;
  maximo_12m: number | null;
  media_5a: number | null;
  percentil_5a: number | null;
}

export interface PontoTesouro {
  data: string;
  taxa_venda: number | null;
  pu_venda: number | null;
}

export async function resumoTesouroDireto(): Promise<ResumoTesouro[]> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase.rpc("tesouro_direto_resumo");
  if (error) {
    console.error(`[titulos] resumo falhou: ${error.code ?? ""} ${error.message}`);
    throw new Error("Não foi possível carregar o Tesouro Direto.");
  }
  return data as ResumoTesouro[];
}

export async function historicoTesouro(titulo: string, vencimento: string, inicio: string, fim: string): Promise<PontoTesouro[]> {
  const supabase = await clienteSupabaseServidor();
  const { data, error } = await supabase
    .from("tesouro_direto")
    .select("data, taxa_venda, pu_venda")
    .eq("titulo", titulo)
    .eq("vencimento", vencimento)
    .gte("data", inicio)
    .lte("data", fim)
    .order("data")
    .limit(5000);
  if (error) {
    console.error(`[titulos] histórico falhou: ${error.code ?? ""} ${error.message}`);
    throw new Error("Não foi possível carregar o histórico do título.");
  }
  return data as PontoTesouro[];
}
