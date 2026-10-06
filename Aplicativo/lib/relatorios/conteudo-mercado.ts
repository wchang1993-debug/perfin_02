import { formatarData } from "@/lib/formatacao";
import type { Aba, Celula } from "@/lib/google/planilhas";
import { percentualDoCdi } from "@/lib/indicadores/percentual-cdi";
import { ROTULOS_PRAZO } from "@/lib/mercado/curvas";
import type {
  ComparacaoSpread,
  ComparacaoVertice,
  IndiceAnbima,
  SpreadVarejo,
  TesouroNaData,
  TituloVariacao,
  VariacaoDebenture,
} from "@/lib/mercado/tipos";

// Abas de mercado do relatório mensal (regra A6): fechamento do mês contra o mês anterior.
// Cada bloco é opcional: sem dados coletados da fonte, a aba não é criada.

export interface DadosMercadoRelatorio {
  curvas: { data: string; dataBase: string | null; vertices: ComparacaoVertice[] } | null;
  rendaFixa: { data: string; indices: IndiceAnbima[]; cdiMes: number | null; titulos: TituloVariacao[] } | null;
  credito: { data: string; dataBase: string | null; spreads: ComparacaoSpread[]; variacoes: VariacaoDebenture[] } | null;
  tesouro: { data: string; titulos: TesouroNaData[]; varejo: SpreadVarejo[] } | null;
}

const PRINCIPAIS_TITULOS = ["NTN-B", "LTN"];

function prazo(du: number): string {
  return ROTULOS_PRAZO[du] ?? `${du} du`;
}

function abaCurvas(c: NonNullable<DadosMercadoRelatorio["curvas"]>): Aba {
  const base = c.dataBase ? formatarData(c.dataBase) : "sem base";
  return {
    nome: "Curvas",
    linhas: [
      ["Prazo", "Pré (% a.a.)", `Δ pré vs ${base} (bps)`, "Real IPCA+ (% a.a.)", "Δ real (bps)", "Implícita (%)", "Δ implícita (bps)"],
      ...c.vertices.map((v): Celula[] => [prazo(v.du), v.pre, v.delta_pre, v.real, v.delta_real, v.implicita, v.delta_implicita]),
      [],
      [`Fonte: ETTJ ANBIMA em ${formatarData(c.data)} (último dia útil coletado do mês).`],
    ],
  };
}

function abaRendaFixa(r: NonNullable<DadosMercadoRelatorio["rendaFixa"]>): Aba {
  const titulos = r.titulos.filter((t) => PRINCIPAIS_TITULOS.includes(t.tipo));
  return {
    nome: "Renda fixa",
    linhas: [
      ["Índice ANBIMA", "Mês (%)", "% do CDI no mês", "Ano (%)", "12 meses (%)", "Duration (du)"],
      ...r.indices.map((i): Celula[] => [
        i.indice, i.variacao_mes, percentualDoCdi(i.variacao_mes, r.cdiMes), i.variacao_ano, i.variacao_12m, i.duration_du,
      ]),
      [],
      ["Título", "Vencimento", "Taxa indicativa (%)", "Δ no mês (bps)", "PU (R$)"],
      ...titulos.map((t): Celula[] => [t.tipo, formatarData(t.vencimento), t.taxa_indicativa, t.var_21d, t.pu]),
      [],
      [`Fonte: ANBIMA em ${formatarData(r.data)}. Δ no mês = variação em 21 pregões.`],
    ],
  };
}

function abaCredito(c: NonNullable<DadosMercadoRelatorio["credito"]>): Aba {
  const base = c.dataBase ? formatarData(c.dataBase) : "sem base";
  return {
    nome: "Crédito",
    linhas: [
      ["Indexador", "Debêntures", "1º quartil (bps)", "Mediana (bps)", "3º quartil (bps)", `Δ mediana vs ${base} (bps)`],
      ...c.spreads.map((s): Celula[] => [s.indexador, s.quantidade, s.p25, s.mediana, s.p75, s.delta_mediana]),
      [],
      ["Maiores variações no último dia", "Emissor", "Indexador", "Taxa anterior (%)", "Taxa atual (%)", "Variação (bps)"],
      ...c.variacoes.map((v): Celula[] => [v.codigo, v.emissor, v.indexador, v.taxa_anterior, v.taxa_atual, v.variacao_bps]),
      [],
      ["Spread: IPCA+ sobre a NTN-B de referência; DI+ sobre o DI; prefixadas sobre a curva pré ANBIMA."],
    ],
  };
}

function abaTesouro(t: NonNullable<DadosMercadoRelatorio["tesouro"]>): Aba {
  const spreads = new Map(t.varejo.map((v) => [`${v.titulo}|${v.vencimento}`, v.spread_bps]));
  return {
    nome: "Tesouro Direto",
    linhas: [
      ["Título", "Vencimento", "Taxa compra (%)", "Taxa venda (%)", "PU compra (R$)", "PU venda (R$)", "Spread do varejo (bps)"],
      ...t.titulos.map((x): Celula[] => [
        x.titulo, formatarData(x.vencimento), x.taxa_compra, x.taxa_venda, x.pu_compra, x.pu_venda,
        spreads.get(`${x.titulo}|${x.vencimento}`) ?? null,
      ]),
      [],
      [`Fonte: Tesouro Transparente em ${formatarData(t.data)}. Spread do varejo: indicativa ANBIMA menos a taxa de compra.`],
    ],
  };
}

export function abasMercado(m: DadosMercadoRelatorio | null): Aba[] {
  if (!m) return [];
  return [
    ...(m.curvas?.vertices.length ? [abaCurvas(m.curvas)] : []),
    ...(m.rendaFixa && (m.rendaFixa.indices.length || m.rendaFixa.titulos.length) ? [abaRendaFixa(m.rendaFixa)] : []),
    ...(m.credito?.spreads.length ? [abaCredito(m.credito)] : []),
    ...(m.tesouro?.titulos.length ? [abaTesouro(m.tesouro)] : []),
  ];
}

export function temDadosAnbima(m: DadosMercadoRelatorio | null): boolean {
  return !!(m?.curvas || m?.rendaFixa || m?.credito);
}
