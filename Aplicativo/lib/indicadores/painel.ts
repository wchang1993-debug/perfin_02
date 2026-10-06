import "server-only";
import { destaquesMacro, type DadosMacro } from "@/lib/destaques/macro";
import type { Destaque } from "@/lib/destaques/tipos";
import {
  acumuladoPeriodo,
  decisoesCopom,
  estatisticasCambio,
  juroReal12m,
  serie12m,
  statusMeta,
  ultimosValores,
} from "./consultas";
import type { Filtro } from "./filtro";
import type { UltimoValor } from "./tipos";

// Monta os dados da visão geral para um filtro. Reaproveitado pela tela, pelo relatório e pelo assistente.

export interface Painel {
  filtro: Filtro;
  ultimos: UltimoValor[];
  dados: DadosMacro;
  cdiNoPeriodo: number | null;
  ipcaNoPeriodo: number | null;
  destaques: Destaque[];
}

function ultimoDe(ultimos: UltimoValor[], codigo: string) {
  const item = ultimos.find((u) => u.codigo === codigo);
  return item?.data && item.valor !== null ? { data: item.data, valor: item.valor } : null;
}

// % do CDI = r_ativo / r_CDI · 100; "n/d" (null) quando o CDI do período não é positivo (regra A3.3).
export function percentualDoCdi(rentabilidade: number | null, cdi: number | null): number | null {
  if (rentabilidade === null || cdi === null || cdi <= 0) return null;
  return (rentabilidade / cdi) * 100;
}

export async function montarPainel(filtro: Filtro): Promise<Painel> {
  const ultimos = await ultimosValores();
  const ipcaUltimo = ultimoDe(ultimos, "IPCA");
  const mesReferencia = ipcaUltimo?.data ?? filtro.fim;

  const [meta, juroReal, igpm12, ipca12, cambio, cdi, poupanca, ipcaPeriodo, decisoes] = await Promise.all([
    statusMeta(mesReferencia),
    juroReal12m(mesReferencia),
    serie12m("IGPM", mesReferencia, mesReferencia),
    serie12m("IPCA", mesReferencia, mesReferencia),
    estatisticasCambio("USD", filtro.inicio, filtro.fim),
    acumuladoPeriodo("CDI", filtro.inicio, filtro.fim),
    acumuladoPeriodo("POUP", filtro.inicio, filtro.fim),
    acumuladoPeriodo("IPCA", filtro.inicio, filtro.fim),
    // Busca desde 2000 para contar a sequência de decisões além do período filtrado.
    decisoesCopom("2000-01-01", filtro.fim),
  ]);

  const dados: DadosMacro = {
    meta,
    ipcaUltimo,
    ipca15Ultimo: ultimoDe(ultimos, "IPCA15"),
    juroReal12m: juroReal,
    igpm12m: igpm12.at(-1)?.acumulado_12m ?? null,
    ipca12m: ipca12.at(-1)?.acumulado_12m ?? null,
    cambio,
    poupancaPercentualCdi: percentualDoCdi(poupanca, cdi),
    selicAtual: ultimoDe(ultimos, "SELIC")?.valor ?? null,
    decisoes,
  };

  return { filtro, ultimos, dados, cdiNoPeriodo: cdi, ipcaNoPeriodo: ipcaPeriodo, destaques: destaquesMacro(dados) };
}
