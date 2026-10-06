import { formatarData, formatarMes, formatarPercentual, formatarReais } from "@/lib/formatacao";
import type { Painel } from "./painel";
import type { UltimoValor } from "./tipos";

export interface DadosCartao {
  rotulo: string;
  valor: string;
  detalhe?: string;
  referencia?: string;
  selo?: { texto: string; atencao?: boolean };
}

const ROTULO_META = {
  acima_do_teto: "Acima do teto",
  abaixo_do_piso: "Abaixo do piso",
  dentro_da_meta: "Dentro da meta",
} as const;

function referencia(u: UltimoValor | undefined): string | undefined {
  if (!u?.data) return undefined;
  return `Ref.: ${u.periodicidade === "mensal" ? formatarMes(u.data) : formatarData(u.data)}`;
}

function variacaoCotacao(u: UltimoValor): string | undefined {
  if (u.valor === null || u.valor_anterior === null || u.valor_anterior === 0) return undefined;
  // Variação diária apenas para exibição (o acumulado do período vem do banco).
  return `${formatarPercentual((u.valor / u.valor_anterior - 1) * 100, 2, true)} no dia`;
}

// Cartões da visão geral (regra A4.1) a partir do painel já calculado.
export function montarCartoes(painel: Painel): DadosCartao[] {
  const u = (codigo: string) => painel.ultimos.find((x) => x.codigo === codigo);
  const { dados } = painel;
  const cartoes: DadosCartao[] = [];

  if (dados.meta) {
    cartoes.push({
      rotulo: "IPCA 12 meses",
      valor: formatarPercentual(dados.meta.ipca_12m),
      detalhe: `Meta ${formatarPercentual(dados.meta.centro)} (${formatarPercentual(dados.meta.piso)} a ${formatarPercentual(dados.meta.teto)})`,
      selo: { texto: ROTULO_META[dados.meta.status], atencao: dados.meta.status !== "dentro_da_meta" },
      referencia: `Ref.: ${formatarMes(dados.meta.mes)}`,
    });
  }
  const selic = u("SELIC");
  if (selic?.valor != null) {
    const ultima = dados.decisoes.at(-1);
    cartoes.push({
      rotulo: "Selic meta",
      valor: formatarPercentual(selic.valor),
      detalhe: ultima ? `Última mudança: ${formatarData(ultima.data)}` : undefined,
      referencia: referencia(selic),
    });
  }
  cartoes.push({
    rotulo: "CDI no período",
    valor: formatarPercentual(painel.cdiNoPeriodo),
    detalhe: `${formatarData(painel.filtro.inicio)} a ${formatarData(painel.filtro.fim)}`,
  });
  const usd = u("USD");
  if (usd?.valor != null) {
    cartoes.push({ rotulo: "Dólar PTAX", valor: formatarReais(usd.valor, 4), detalhe: variacaoCotacao(usd), referencia: referencia(usd) });
  }
  cartoes.push({ rotulo: "Juro real ex-post 12m", valor: formatarPercentual(dados.juroReal12m), detalhe: "CDI descontado o IPCA" });
  cartoes.push({ rotulo: "IGP-M 12 meses", valor: formatarPercentual(dados.igpm12m), referencia: referencia(u("IGPM")) });
  return cartoes;
}
