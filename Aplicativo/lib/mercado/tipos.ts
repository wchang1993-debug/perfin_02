// Dados de mercado como chegam das funções SQL (diferenças de taxa já em bps).

export type FonteMercado = "curvas" | "titulos" | "indices" | "debentures" | "tesouro" | "b3";

export interface VerticeChave {
  du: number;
  pre: number | null;
  real: number | null;
  implicita: number | null;
}

export interface Deslocamento extends VerticeChave {
  pre_1d: number | null;
  pre_5d: number | null;
  pre_21d: number | null;
  pre_252d: number | null;
  real_1d: number | null;
  real_5d: number | null;
  real_21d: number | null;
  real_252d: number | null;
}

export interface HistoricoVertices {
  data: string;
  pre_2a: number | null;
  pre_10a: number | null;
  inclinacao_bps: number | null;
  implicita_5a: number | null;
  real_5a: number | null;
}

export interface TituloVariacao {
  tipo: string;
  vencimento: string;
  codigo_selic: string | null;
  taxa_indicativa: number;
  pu: number;
  intervalo_min: number | null;
  intervalo_max: number | null;
  var_1d: number | null;
  var_5d: number | null;
  var_21d: number | null;
}

export interface SpreadVarejo {
  titulo: string;
  vencimento: string;
  tipo_anbima: string;
  taxa_tesouro: number;
  taxa_anbima: number;
  spread_bps: number;
}

export interface SpreadDebenture {
  codigo: string;
  emissor: string;
  indexador: string;
  vencimento: string | null;
  duration_du: number | null;
  faixa: string | null;
  taxa_indicativa: number;
  spread_bps: number | null;
}

export interface ResumoSpread {
  indexador: string;
  faixa: string;
  quantidade: number;
  p25: number;
  mediana: number;
  p75: number;
}

export interface MedianaSpread {
  data: string;
  indexador: string;
  mediana: number;
  quantidade: number;
}

export interface VariacaoDebenture {
  codigo: string;
  emissor: string;
  indexador: string;
  taxa_anterior: number;
  taxa_atual: number;
  variacao_bps: number;
}

export interface IndiceAnbima {
  data: string;
  indice: string;
  numero_indice: number;
  variacao_dia: number | null;
  variacao_mes: number | null;
  variacao_ano: number | null;
  variacao_12m: number | null;
  duration_du: number | null;
}

export interface DesempenhoIndice {
  indice: string;
  rentabilidade: number;
  valor_final: number;
  duration_du: number | null;
}

export interface PontoIndice {
  indice: string;
  data: string;
  valor: number;
}

export interface ComparacaoVertice {
  du: number;
  pre: number | null;
  real: number | null;
  implicita: number | null;
  delta_pre: number | null;
  delta_real: number | null;
  delta_implicita: number | null;
}

export interface ComparacaoSpread {
  indexador: string;
  quantidade: number;
  p25: number;
  mediana: number;
  p75: number;
  delta_mediana: number | null;
}

export interface TesouroNaData {
  data: string;
  titulo: string;
  vencimento: string;
  taxa_compra: number | null;
  taxa_venda: number | null;
  pu_compra: number | null;
  pu_venda: number | null;
}
