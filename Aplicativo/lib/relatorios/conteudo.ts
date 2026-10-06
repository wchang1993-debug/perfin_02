import type { Destaque } from "@/lib/destaques/tipos";
import { formatarMes } from "@/lib/formatacao";
import type { Aba, Celula } from "@/lib/google/planilhas";
import type { Simulacao, StatusMeta } from "@/lib/indicadores/tipos";
import { abasMercado, temDadosAnbima, type DadosMercadoRelatorio } from "./conteudo-mercado";

// Conteúdo do relatório mensal (regra A6). Funções puras: recebem dados já calculados no banco.

export const INDICADORES_MENSAIS = ["IPCA", "IPCA15", "INPC", "IGPM", "POUP"] as const;
// O aviso cita as fontes efetivamente usadas no material.
export function avisoLegal(comAnbima: boolean): string {
  const fontes = comAnbima
    ? "Banco Central do Brasil, Tesouro Nacional e ANBIMA"
    : "Banco Central do Brasil e Tesouro Nacional";
  return `Material informativo, elaborado com dados públicos de ${fontes}. Não constitui recomendação de investimento.`;
}

export interface LinhaResumo {
  codigo: string;
  nome: string;
  unidade: string;
  valorMes: number | null;
  noAno: number | null;
  em12m: number | null;
  mesAnterior: number | null;
}

export interface DadosRelatorio {
  mes: string; // aaaa-mm-01
  geradoEm: string; // ISO
  resumo: LinhaResumo[];
  meta: StatusMeta | null;
  destaques: Destaque[];
  comparativoAno: Simulacao[];
  comparativo12m: Simulacao[];
  series: { codigo: string; nome: string; pontos: { data: string; valor: number }[] }[];
  mercado: DadosMercadoRelatorio | null;
}

export function statusDoRelatorio(resumo: LinhaResumo[]): { status: "completo" | "preliminar"; faltantes: string[] } {
  const faltantes = resumo
    .filter((l) => (INDICADORES_MENSAIS as readonly string[]).includes(l.codigo) && l.valorMes === null)
    .map((l) => l.nome);
  return { status: faltantes.length === 0 ? "completo" : "preliminar", faltantes };
}

export function tituloRelatorio(mes: string): string {
  return `Relatório de Indicadores — ${formatarMes(mes)} — Perfin`;
}

const STATUS_META: Record<StatusMeta["status"], string> = {
  acima_do_teto: "Acima do teto",
  abaixo_do_piso: "Abaixo do piso",
  dentro_da_meta: "Dentro da meta",
};

function abaResumo(dados: DadosRelatorio): Aba {
  const linhas: Celula[][] = [
    ["Indicador", "Unidade", "Mês", "Mês anterior", "No ano (%)", "12 meses (%)"],
    ...dados.resumo.map((l) => [l.nome, l.unidade, l.valorMes, l.mesAnterior, l.noAno, l.em12m]),
  ];
  if (dados.meta) {
    linhas.push([], ["Meta de inflação", "Centro (%)", "Piso (%)", "Teto (%)", "IPCA 12m (%)", "Status"]);
    linhas.push(["CMN", dados.meta.centro, dados.meta.piso, dados.meta.teto, dados.meta.ipca_12m, STATUS_META[dados.meta.status]]);
  }
  return { nome: "Resumo", linhas };
}

function abaComparativo(dados: DadosRelatorio): Aba {
  const bloco = (titulo: string, lista: Simulacao[]): Celula[][] => [
    [titulo, "Rentabilidade (%)", "R$ 10.000 viraram (R$)"],
    ...lista.map((s) => [s.nome, s.rentabilidade, s.valor_final]),
  ];
  return { nome: "Comparativo", linhas: [...bloco("No ano", dados.comparativoAno), [], ...bloco("Em 12 meses", dados.comparativo12m)] };
}

function abaSeries(dados: DadosRelatorio): Aba {
  const meses = [...new Set(dados.series.flatMap((s) => s.pontos.map((p) => p.data)))].sort();
  const cabecalho: Celula[] = ["Mês", ...dados.series.map((s) => s.nome)];
  const linhas = meses.map((mes) => [
    formatarMes(mes),
    ...dados.series.map((s) => s.pontos.find((p) => p.data === mes)?.valor ?? null),
  ]);
  return { nome: "Séries", linhas: [cabecalho, ...linhas] };
}

export function montarAbas(dados: DadosRelatorio): Aba[] {
  const { status, faltantes } = statusDoRelatorio(dados.resumo);
  const notas: Celula[][] = [
    ["Nota"],
    [`Status: ${status === "completo" ? "Completo" : `Preliminar — falta divulgar: ${faltantes.join(", ")}`}`],
    [`Mês de referência: ${formatarMes(dados.mes)}`],
    [`Extraído em: ${dados.geradoEm}`],
    ["Fontes: BCB/SGS (433 IPCA, 7478 IPCA-15, 188 INPC, 189 IGP-M, 195 Poupança, 432 Selic, 12 CDI, 1 PTAX dólar, 21619 PTAX euro); Tesouro Transparente."],
    ...(temDadosAnbima(dados.mercado) ? [["ANBIMA: ETTJ (curvas pré, real e implícita), índices IMA, taxas indicativas de títulos públicos e debêntures."]] : []),
    ["Fórmulas: acumulados por capitalização composta (∏(1+taxa) − 1); câmbio pela variação entre o primeiro e o último dia do período."],
    [avisoLegal(temDadosAnbima(dados.mercado))],
  ];
  return [
    abaResumo(dados),
    { nome: "Destaques", linhas: [["Destaque"], ...dados.destaques.map((d) => [d.texto])] },
    ...abasMercado(dados.mercado),
    abaComparativo(dados),
    abaSeries(dados),
    { nome: "Notas", linhas: notas },
  ];
}

export function corpoEmail(dados: { mes: string; destaques: Destaque[]; urlPlanilha: string; comAnbima: boolean }): string {
  return [
    "Olá,",
    "",
    `Segue o relatório de indicadores de ${formatarMes(dados.mes)}. Principais pontos:`,
    "",
    ...dados.destaques.slice(0, 5).map((d) => `• ${d.texto}`),
    "",
    `Planilha: ${dados.urlPlanilha}`,
    "",
    avisoLegal(dados.comAnbima),
  ].join("\n");
}
