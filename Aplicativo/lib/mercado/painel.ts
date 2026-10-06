import "server-only";
import type { DadosMercado } from "@/lib/destaques/mercado";
import { acumuladoPeriodo } from "@/lib/indicadores/consultas";
import { percentualDoCdi } from "@/lib/indicadores/percentual-cdi";
import {
  datasMercado,
  deslocamentoCurvas,
  indicesNaData,
  maioresVariacoesDebentures,
  medianaSpreadsHist,
  spreadVarejo,
  titulosVariacao,
} from "./consultas";
import type { FonteMercado } from "./tipos";

export interface PainelMercado {
  datas: Partial<Record<FonteMercado, string>>;
  dados: DadosMercado;
}

const DIAS_JANELA_CREDITO = 31;

function diasAntes(iso: string, dias: number): string {
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() - dias);
  return data.toISOString().slice(0, 10);
}

// Dados de mercado para destaques e cartões. Cada fonte é opcional: sem coleta, a parte fica vazia.
export async function montarPainelMercado(tetoMeta: number | null): Promise<PainelMercado | null> {
  const datas = await datasMercado();
  if (!datas.curvas && !datas.titulos && !datas.indices && !datas.debentures) return null;

  const [deslocamentos, titulos, varejo, indices, medianas, variacoes, cdiMes] = await Promise.all([
    datas.curvas ? deslocamentoCurvas(datas.curvas) : [],
    datas.titulos ? titulosVariacao(datas.titulos) : [],
    datas.titulos ? spreadVarejo(datas.titulos) : [],
    datas.indices ? indicesNaData(datas.indices) : [],
    datas.debentures ? medianaSpreadsHist(diasAntes(datas.debentures, DIAS_JANELA_CREDITO), datas.debentures) : [],
    datas.debentures ? maioresVariacoesDebentures(datas.debentures, 10) : [],
    // CDI do mês até a data do índice, para o IMA-B em % do CDI.
    datas.indices ? acumuladoPeriodo("CDI", `${datas.indices.slice(0, 7)}-01`, datas.indices) : null,
  ]);

  const imaB = indices.find((i) => i.indice === "IMA-B");
  return {
    datas,
    dados: {
      deslocamentos,
      tetoMeta,
      titulos,
      spreadVarejo: varejo,
      imaB: imaB ? { variacaoMes: imaB.variacao_mes, percentualCdi: percentualDoCdi(imaB.variacao_mes, cdiMes) } : null,
      medianasIpca: medianas.filter((m) => m.indexador === "IPCA+"),
      variacoesDebentures: variacoes,
    },
  };
}
