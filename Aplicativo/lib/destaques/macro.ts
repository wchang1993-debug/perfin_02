import { formatarData, formatarMes, formatarPercentual, formatarPp, formatarReais } from "@/lib/formatacao";
import type { DecisaoCopom, EstatisticasCambio, StatusMeta } from "@/lib/indicadores/tipos";
import { priorizar, type Destaque } from "./tipos";

// Limiares das regras de destaque (regra de negócio A5).
export const LIMIAR_VARIACAO_CAMBIO = 3; // % no período
export const LIMIAR_SPREAD_IGPM_IPCA = 1; // p.p. em 12 meses
export const LIMIAR_DECISOES_SEGUIDAS = 2;

export interface DadosMacro {
  meta: StatusMeta | null;
  ipcaUltimo: { data: string; valor: number } | null;
  ipca15Ultimo: { data: string; valor: number } | null;
  juroReal12m: number | null;
  igpm12m: number | null;
  ipca12m: number | null;
  cambio: EstatisticasCambio | null;
  poupancaPercentualCdi: number | null;
  selicAtual: number | null;
  decisoes: DecisaoCopom[];
}

function regraMeta({ meta }: DadosMacro): Destaque[] {
  if (!meta) return [];
  const mes = formatarMes(meta.mes);
  if (meta.status === "dentro_da_meta") {
    return [{ id: "meta", severidade: "informativo", raridade: 0,
      texto: `IPCA 12m em ${formatarPercentual(meta.ipca_12m)} (${mes}), dentro da meta (${formatarPercentual(meta.piso)} a ${formatarPercentual(meta.teto)}).` }];
  }
  const lado = meta.status === "acima_do_teto" ? `acima do teto (${formatarPercentual(meta.teto)})` : `abaixo do piso (${formatarPercentual(meta.piso)})`;
  const sequencia = meta.meses_fora > 1 ? ` pelo ${meta.meses_fora}º mês seguido` : "";
  const descumprimento = meta.meses_fora >= 6 ? " — seis meses seguidos fora da banda configuram descumprimento da meta." : ".";
  return [{ id: "meta", severidade: "atencao", raridade: meta.meses_fora >= 6 ? 2 : 1,
    texto: `IPCA 12m em ${formatarPercentual(meta.ipca_12m)} (${mes}), ${lado}${sequencia}${descumprimento}` }];
}

function regraPreviaIpca({ ipcaUltimo, ipca15Ultimo }: DadosMacro): Destaque[] {
  // Só faz sentido quando o IPCA-15 do mês já saiu e o IPCA do mesmo mês ainda não.
  if (!ipcaUltimo || !ipca15Ultimo || ipca15Ultimo.data <= ipcaUltimo.data) return [];
  const direcao = ipca15Ultimo.valor < ipcaUltimo.valor ? "sinal de desaceleração" : ipca15Ultimo.valor > ipcaUltimo.valor ? "sinal de aceleração" : "estável";
  return [{ id: "previa-ipca", severidade: "informativo", raridade: 1,
    texto: `IPCA-15 de ${formatarMes(ipca15Ultimo.data)} em ${formatarPercentual(ipca15Ultimo.valor)}, contra IPCA de ${formatarMes(ipcaUltimo.data)} em ${formatarPercentual(ipcaUltimo.valor)}: ${direcao}.` }];
}

function regraJuroReal({ juroReal12m }: DadosMacro): Destaque[] {
  if (juroReal12m === null) return [];
  return [{ id: "juro-real", severidade: "informativo", raridade: 0,
    texto: `Juro real ex-post de ${formatarPercentual(juroReal12m)} em 12 meses (CDI descontado o IPCA).` }];
}

function regraSpreadIgpm({ igpm12m, ipca12m }: DadosMacro): Destaque[] {
  if (igpm12m === null || ipca12m === null) return [];
  const spread = igpm12m - ipca12m;
  if (Math.abs(spread) < LIMIAR_SPREAD_IGPM_IPCA) return [];
  const efeito = spread < 0 ? "aluguéis corrigidos pelo IGP-M sobem menos que a inflação ao consumidor" : "aluguéis corrigidos pelo IGP-M sobem mais que a inflação ao consumidor";
  return [{ id: "igpm-ipca", severidade: "informativo", raridade: 1,
    texto: `IGP-M 12m ${formatarPp(spread)} em relação ao IPCA: ${efeito}.` }];
}

function regraCambio({ cambio }: DadosMacro): Destaque[] {
  if (!cambio || cambio.variacao === null || Math.abs(cambio.variacao) < LIMIAR_VARIACAO_CAMBIO) return [];
  const vol = cambio.volatilidade_aa !== null ? ` Volatilidade de ${formatarPercentual(cambio.volatilidade_aa, 1)} a.a.` : "";
  return [{ id: "cambio", severidade: "atencao", raridade: 1,
    texto: `Dólar ${formatarPercentual(cambio.variacao, 1, true)} no período (máxima de ${formatarReais(cambio.maximo, 4)} em ${formatarData(cambio.data_maximo)}).${vol}` }];
}

function regraPoupanca({ poupancaPercentualCdi }: DadosMacro): Destaque[] {
  if (poupancaPercentualCdi === null) return [];
  return [{ id: "poupanca", severidade: "informativo", raridade: 0,
    texto: `Poupança rendeu ${formatarPercentual(poupancaPercentualCdi, 0)} do CDI no período.` }];
}

// Conta quantas decisões seguidas (das mais recentes para trás) foram na mesma direção.
export function decisoesSeguidas(decisoes: DecisaoCopom[]): { direcao: "alta" | "corte"; quantidade: number } | null {
  const ultima = decisoes.at(-1);
  if (!ultima) return null;
  const sinal = Math.sign(ultima.variacao_pp);
  let quantidade = 0;
  for (let i = decisoes.length - 1; i >= 0 && Math.sign(decisoes[i]!.variacao_pp) === sinal; i--) quantidade++;
  return { direcao: sinal > 0 ? "alta" : "corte", quantidade };
}

function regraCopom({ decisoes, selicAtual }: DadosMacro): Destaque[] {
  const ultima = decisoes.at(-1);
  const ciclo = decisoesSeguidas(decisoes);
  if (!ultima || !ciclo || selicAtual === null) return [];
  const sequencia = ciclo.quantidade >= LIMIAR_DECISOES_SEGUIDAS ? `, ${ciclo.quantidade}ª ${ciclo.direcao === "alta" ? "alta" : "redução"} seguida` : "";
  return [{ id: "copom", severidade: "informativo", raridade: ciclo.quantidade >= LIMIAR_DECISOES_SEGUIDAS ? 1 : 0,
    texto: `Selic meta em ${formatarPercentual(selicAtual)}: última mudança em ${formatarData(ultima.data)} (${formatarPp(ultima.variacao_pp)}${sequencia}).` }];
}

const REGRAS = [regraMeta, regraPreviaIpca, regraJuroReal, regraSpreadIgpm, regraCambio, regraPoupanca, regraCopom];

export function destaquesMacro(dados: DadosMacro, maximo?: number): Destaque[] {
  return priorizar(REGRAS.flatMap((regra) => regra(dados)), maximo);
}
