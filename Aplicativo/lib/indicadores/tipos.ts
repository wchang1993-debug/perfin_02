// Tipos dos dados de indicadores como chegam do banco (numeric chega como number via PostgREST;
// usados só para exibição — os cálculos ficam nas funções SQL).

export type CodigoIndicador =
  | "IPCA"
  | "IPCA15"
  | "INPC"
  | "IGPM"
  | "POUP"
  | "SELIC"
  | "CDI"
  | "CDI_AA"
  | "USD"
  | "EUR";

export interface UltimoValor {
  codigo: CodigoIndicador;
  nome: string;
  unidade: string;
  tipo: "taxa_mensal" | "taxa_diaria" | "taxa_anual" | "cotacao";
  periodicidade: "diaria" | "mensal";
  casas_decimais: number;
  data: string | null;
  valor: number | null;
  data_anterior: string | null;
  valor_anterior: number | null;
}

export interface Ponto {
  data: string;
  valor: number;
}

export interface Ponto12m {
  data: string;
  valor_mes: number;
  acumulado_12m: number;
}

export interface StatusMeta {
  mes: string;
  ipca_12m: number;
  centro: number;
  piso: number;
  teto: number;
  status: "acima_do_teto" | "abaixo_do_piso" | "dentro_da_meta";
  meses_fora: number;
}

export interface EstatisticasCambio {
  primeiro: number | null;
  ultimo: number | null;
  variacao: number | null;
  maximo: number | null;
  data_maximo: string | null;
  minimo: number | null;
  data_minimo: string | null;
  media: number | null;
  volatilidade_aa: number | null;
}

export interface DecisaoCopom {
  data: string;
  selic_anterior: number;
  selic_nova: number;
  variacao_pp: number;
}

export interface PontoBase100 {
  codigo: CodigoIndicador;
  data: string;
  valor: number;
}

export interface Simulacao {
  codigo: CodigoIndicador;
  nome: string;
  rentabilidade: number;
  valor_final: number;
}

export interface IndicadorDesatualizado {
  codigo: CodigoIndicador;
  nome: string;
  ultima_data: string | null;
}
