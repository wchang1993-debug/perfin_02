import "server-only";
import { acumuladoPeriodo } from "@/lib/indicadores/consultas";
import {
  compararSpreads,
  compararVertices,
  indicesNaData,
  maioresVariacoesDebentures,
  spreadVarejo,
  tesouroNaData,
  titulosVariacao,
  ultimaDataMercado,
} from "@/lib/mercado/consultas";
import type { DadosMercadoRelatorio } from "./conteudo-mercado";

const MAIORES_VARIACOES = 10;

// Fechamento de mercado do mês (último dia coletado até o fim do mês) contra o fim do mês anterior.
export async function coletarDadosMercadoRelatorio(fimMes: string, fimMesAnterior: string): Promise<DadosMercadoRelatorio> {
  const [curvas, curvasBase, titulos, indices, debentures, debenturesBase, tesouro] = await Promise.all([
    ultimaDataMercado("curvas", fimMes),
    ultimaDataMercado("curvas", fimMesAnterior),
    ultimaDataMercado("titulos", fimMes),
    ultimaDataMercado("indices", fimMes),
    ultimaDataMercado("debentures", fimMes),
    ultimaDataMercado("debentures", fimMesAnterior),
    ultimaDataMercado("tesouro", fimMes),
  ]);

  const [vertices, listaTitulos, listaIndices, cdiMes, spreads, variacoes, listaTesouro, varejo] = await Promise.all([
    curvas ? compararVertices(curvas, curvasBase ?? curvas) : [],
    titulos ? titulosVariacao(titulos) : [],
    indices ? indicesNaData(indices) : [],
    indices ? acumuladoPeriodo("CDI", `${indices.slice(0, 7)}-01`, indices) : null,
    debentures ? compararSpreads(debentures, debenturesBase ?? debentures) : [],
    debentures ? maioresVariacoesDebentures(debentures, MAIORES_VARIACOES) : [],
    tesouro ? tesouroNaData(tesouro) : [],
    titulos ? spreadVarejo(titulos) : [],
  ]);

  return {
    curvas: curvas ? { data: curvas, dataBase: curvasBase, vertices } : null,
    rendaFixa: indices || titulos ? { data: (indices ?? titulos)!, indices: listaIndices, cdiMes, titulos: listaTitulos } : null,
    credito: debentures ? { data: debentures, dataBase: debenturesBase, spreads, variacoes } : null,
    tesouro: tesouro ? { data: tesouro, titulos: listaTesouro, varejo } : null,
  };
}
