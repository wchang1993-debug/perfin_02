import "server-only";
import { acumuladoPeriodo, serie, simulacao10mil, statusMeta, ultimosValores } from "@/lib/indicadores/consultas";
import { montarPainel } from "@/lib/indicadores/painel";
import type { CodigoIndicador, UltimoValor } from "@/lib/indicadores/tipos";
import type { DadosRelatorio, LinhaResumo } from "./conteudo";
import { coletarDadosMercadoRelatorio } from "./dados-mercado";

const CODIGOS_RESUMO: CodigoIndicador[] = ["IPCA", "IPCA15", "INPC", "IGPM", "POUP", "CDI", "SELIC", "USD", "EUR"];
const CODIGOS_COMPARATIVO: CodigoIndicador[] = ["CDI", "POUP", "IPCA", "USD"];
const CODIGOS_SERIES: CodigoIndicador[] = ["IPCA", "IPCA15", "INPC", "IGPM", "POUP"];
const MESES_SERIES = 24;

// Datas do mês de referência (aaaa-mm-01) usadas pelos acumulados.
export function janelasDoMes(mes: string) {
  const [ano, m] = mes.split("-").map(Number) as [number, number];
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return {
    inicioMes: mes,
    fimMes: iso(new Date(Date.UTC(ano, m, 0))),
    inicioMesAnterior: iso(new Date(Date.UTC(ano, m - 2, 1))),
    fimMesAnterior: iso(new Date(Date.UTC(ano, m - 1, 0))),
    inicioAno: `${ano}-01-01`,
    inicio12m: iso(new Date(Date.UTC(ano, m - 12, 1))),
    inicioSeries: iso(new Date(Date.UTC(ano, m - MESES_SERIES, 1))),
  };
}

// Mês padrão do relatório: último mês com IPCA divulgado.
export function mesPadrao(ultimos: UltimoValor[]): string | null {
  return ultimos.find((u) => u.codigo === "IPCA")?.data?.slice(0, 7).concat("-01") ?? null;
}

async function linhaResumo(item: UltimoValor, mes: string): Promise<LinhaResumo> {
  const j = janelasDoMes(mes);
  const [valorMes, mesAnterior, noAno, em12m] = await Promise.all([
    acumuladoPeriodo(item.codigo, j.inicioMes, j.fimMes),
    acumuladoPeriodo(item.codigo, j.inicioMesAnterior, j.fimMesAnterior),
    acumuladoPeriodo(item.codigo, j.inicioAno, j.fimMes),
    acumuladoPeriodo(item.codigo, j.inicio12m, j.fimMes),
  ]);
  return { codigo: item.codigo, nome: item.nome, unidade: item.unidade, valorMes, mesAnterior, noAno, em12m };
}

export async function coletarDadosRelatorio(mes: string): Promise<DadosRelatorio> {
  const j = janelasDoMes(mes);
  const ultimos = await ultimosValores();
  const itens = CODIGOS_RESUMO.map((c) => ultimos.find((u) => u.codigo === c)).filter((u): u is UltimoValor => !!u);

  const [resumo, meta, comparativoAno, comparativo12m, series, painel, mercado] = await Promise.all([
    Promise.all(itens.map((item) => linhaResumo(item, mes))),
    statusMeta(mes),
    simulacao10mil(CODIGOS_COMPARATIVO, j.inicioAno, j.fimMes),
    simulacao10mil(CODIGOS_COMPARATIVO, j.inicio12m, j.fimMes),
    Promise.all(
      CODIGOS_SERIES.map(async (codigo) => ({
        codigo,
        nome: ultimos.find((u) => u.codigo === codigo)?.nome ?? codigo,
        pontos: await serie(codigo, j.inicioSeries, j.fimMes),
      })),
    ),
    montarPainel({ periodo: "personalizado", inicio: j.inicioMes, fim: j.fimMes }),
    coletarDadosMercadoRelatorio(j.fimMes, j.fimMesAnterior),
  ]);

  return {
    mes,
    geradoEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    resumo,
    meta,
    destaques: painel.destaques,
    comparativoAno,
    comparativo12m,
    series,
    mercado,
  };
}
