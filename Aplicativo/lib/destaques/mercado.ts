import { formatarBps, formatarData, formatarPercentual } from "@/lib/formatacao";
import type { Deslocamento, MedianaSpread, SpreadVarejo, TituloVariacao, VariacaoDebenture } from "@/lib/mercado/tipos";
import type { Destaque } from "./tipos";

// Limiares das regras de destaque de mercado (regra de negócio A5).
export const LIMIAR_INCLINACAO_BPS = 15; // mudança da inclinação 10a − 2a na semana
export const LIMIAR_NTNB_SEMANA_BPS = 20; // variação semanal da NTN-B mais longa
export const LIMIAR_SPREAD_CREDITO_BPS = 10; // mudança da mediana de spread no período
export const LIMIAR_DEBENTURE_DIA_BPS = 100; // variação diária de uma debênture
export const DU_2A = 504;
export const DU_5A = 1260;
export const DU_10A = 2520;

export interface DadosMercado {
  deslocamentos: Deslocamento[];
  tetoMeta: number | null;
  titulos: TituloVariacao[];
  spreadVarejo: SpreadVarejo[];
  imaB: { variacaoMes: number | null; percentualCdi: number | null } | null;
  medianasIpca: MedianaSpread[];
  variacoesDebentures: VariacaoDebenture[];
}

const vertice = (d: Deslocamento[], du: number) => d.find((v) => v.du === du);

function regraInclinacao({ deslocamentos }: DadosMercado): Destaque[] {
  const curto = vertice(deslocamentos, DU_2A);
  const longo = vertice(deslocamentos, DU_10A);
  if (!curto?.pre || !longo?.pre || curto.pre_5d === null || longo.pre_5d === null) return [];
  const atual = (longo.pre - curto.pre) * 100;
  const mudanca = longo.pre_5d - curto.pre_5d;
  if (Math.abs(mudanca) < LIMIAR_INCLINACAO_BPS) return [];
  const verbo = mudanca > 0 ? "inclinou" : "achatou";
  return [{ id: "inclinacao", severidade: "informativo", raridade: 1,
    texto: `Curva pré ${verbo}: 10a − 2a em ${formatarBps(atual, false)} (${formatarBps(mudanca)} na semana).` }];
}

function regraImplicita({ deslocamentos, tetoMeta }: DadosMercado): Destaque[] {
  const cinco = vertice(deslocamentos, DU_5A);
  if (!cinco?.implicita) return [];
  if (tetoMeta !== null && cinco.implicita > tetoMeta) {
    return [{ id: "implicita", severidade: "atencao", raridade: 1,
      texto: `Inflação implícita de 5 anos em ${formatarPercentual(cinco.implicita)}, acima do teto da meta (${formatarPercentual(tetoMeta)}): o mercado não precifica convergência.` }];
  }
  return [{ id: "implicita", severidade: "informativo", raridade: 0,
    texto: `Inflação implícita de 5 anos em ${formatarPercentual(cinco.implicita)}.` }];
}

function regraNtnbLonga({ titulos }: DadosMercado): Destaque[] {
  const longa = titulos.filter((t) => t.tipo === "NTN-B").at(-1);
  if (!longa || longa.var_5d === null || Math.abs(longa.var_5d) < LIMIAR_NTNB_SEMANA_BPS) return [];
  return [{ id: "ntnb", severidade: "informativo", raridade: 1,
    texto: `NTN-B ${formatarData(longa.vencimento)} a IPCA + ${formatarPercentual(longa.taxa_indicativa)} (${formatarBps(longa.var_5d)} na semana).` }];
}

function regraSpreadVarejo({ spreadVarejo }: DadosMercado): Destaque[] {
  const maior = [...spreadVarejo].sort((a, b) => b.spread_bps - a.spread_bps)[0];
  if (!maior || maior.spread_bps <= 0) return [];
  return [{ id: "varejo", severidade: "informativo", raridade: 0,
    texto: `${maior.titulo} ${formatarData(maior.vencimento)} paga ${formatarBps(maior.spread_bps, false)} a menos que a ${maior.tipo_anbima} equivalente (spread do varejo).` }];
}

function regraImaB({ imaB }: DadosMercado): Destaque[] {
  if (!imaB || imaB.variacaoMes === null) return [];
  const cdi = imaB.percentualCdi !== null ? ` (${formatarPercentual(imaB.percentualCdi, 0)} do CDI)` : "";
  return [{ id: "imab", severidade: "informativo", raridade: 0,
    texto: `IMA-B ${formatarPercentual(imaB.variacaoMes, 2, true)} no mês${cdi}.` }];
}

function regraCredito({ medianasIpca }: DadosMercado): Destaque[] {
  const primeira = medianasIpca.at(0);
  const ultima = medianasIpca.at(-1);
  if (!primeira || !ultima || primeira.data === ultima.data) return [];
  const mudanca = ultima.mediana - primeira.mediana;
  if (Math.abs(mudanca) < LIMIAR_SPREAD_CREDITO_BPS) return [];
  const verbo = mudanca < 0 ? "fechou" : "abriu";
  return [{ id: "credito", severidade: mudanca > 0 ? "atencao" : "informativo", raridade: 1,
    texto: `Spread mediano das debêntures IPCA+ ${verbo} ${formatarBps(Math.abs(mudanca), false)} no período, para ${formatarBps(ultima.mediana, false)} sobre a NTN-B.` }];
}

function regraDebentureDia({ variacoesDebentures }: DadosMercado): Destaque[] {
  return variacoesDebentures
    .filter((v) => Math.abs(v.variacao_bps) >= LIMIAR_DEBENTURE_DIA_BPS)
    .slice(0, 2)
    .map((v) => ({ id: `deb-${v.codigo}`, severidade: "atencao" as const, raridade: 1,
      texto: `Debênture ${v.codigo} (${v.emissor}) com taxa indicativa ${formatarBps(v.variacao_bps)} no dia.` }));
}

const REGRAS = [regraInclinacao, regraImplicita, regraNtnbLonga, regraSpreadVarejo, regraImaB, regraCredito, regraDebentureDia];

export function destaquesMercado(dados: DadosMercado): Destaque[] {
  return REGRAS.flatMap((regra) => regra(dados));
}
