import { z } from "zod";
import { formatarData, formatarMes, formatarNumero, formatarPercentual } from "@/lib/formatacao";
import { PERIODOS } from "@/lib/indicadores/filtro";
import type { Painel } from "@/lib/indicadores/painel";
import { linhasContextoMercado } from "./contexto-mercado";

// Entrada do chat, validada no servidor. Os dados NUNCA vêm do navegador: só o filtro.
export const LIMITE_MENSAGEM = 2000;
export const LIMITE_HISTORICO = 20;

export const esquemaPergunta = z.object({
  mensagem: z.string().trim().min(1).max(LIMITE_MENSAGEM),
  historico: z
    .array(z.object({ papel: z.enum(["usuario", "assistente"]), texto: z.string().max(8000) }))
    .max(LIMITE_HISTORICO)
    .default([]),
  filtro: z.object({
    periodo: z.enum(PERIODOS),
    inicio: z.iso.date().optional(),
    fim: z.iso.date().optional(),
  }),
});

export type Pergunta = z.infer<typeof esquemaPergunta>;

export const INSTRUCAO_SISTEMA = [
  "Você é o assistente de análise do Portal Perfin, usado pelo time da Perfin Wealth Management.",
  "Responda em português do Brasil, de forma executiva e precisa.",
  "Use SOMENTE os dados fornecidos no bloco DADOS. Cite a data ou o período e a fonte (BCB/SGS, ANBIMA ou Tesouro Direto) quando usar um número.",
  "Se a informação pedida não estiver nos dados, diga claramente que ela não está disponível no Portal.",
  "Não faça recomendação de investimento personalizada e não fale sobre clientes.",
  "Não invente números nem projeções.",
].join("\n");

// Resumo dos dados do filtro atual, em texto — agregados, não tabelas completas.
export function montarContexto(painel: Painel): string {
  const { filtro, ultimos, dados } = painel;
  const linhasUltimos = ultimos
    .filter((u) => u.data && u.valor !== null)
    .map((u) => `- ${u.nome} (${u.unidade}): ${formatarNumero(u.valor, u.casas_decimais)} em ${u.periodicidade === "mensal" ? formatarMes(u.data) : formatarData(u.data)}`);

  const linhas = [
    `PERÍODO DO FILTRO: ${formatarData(filtro.inicio)} a ${formatarData(filtro.fim)}`,
    "",
    "ÚLTIMOS VALORES:",
    ...linhasUltimos,
    "",
    "NO PERÍODO DO FILTRO:",
    `- CDI acumulado: ${formatarPercentual(painel.cdiNoPeriodo)}`,
    `- IPCA acumulado: ${formatarPercentual(painel.ipcaNoPeriodo)}`,
    `- Poupança em % do CDI: ${formatarPercentual(dados.poupancaPercentualCdi, 0)}`,
  ];
  if (dados.cambio) {
    linhas.push(
      `- Dólar PTAX: variação ${formatarPercentual(dados.cambio.variacao)}, máxima ${formatarNumero(dados.cambio.maximo, 4)} em ${formatarData(dados.cambio.data_maximo)}, mínima ${formatarNumero(dados.cambio.minimo, 4)} em ${formatarData(dados.cambio.data_minimo)}, volatilidade ${formatarPercentual(dados.cambio.volatilidade_aa, 1)} a.a.`,
    );
  }
  linhas.push("", "INDICADORES EM 12 MESES (último mês com IPCA divulgado):");
  linhas.push(`- IPCA 12m: ${formatarPercentual(dados.ipca12m)}; IGP-M 12m: ${formatarPercentual(dados.igpm12m)}; juro real ex-post 12m: ${formatarPercentual(dados.juroReal12m)}`);
  if (dados.meta) {
    linhas.push(`- Meta de inflação: centro ${formatarPercentual(dados.meta.centro)}, banda ${formatarPercentual(dados.meta.piso)} a ${formatarPercentual(dados.meta.teto)}; status ${dados.meta.status.replaceAll("_", " ")}; meses seguidos fora: ${dados.meta.meses_fora}`);
  }
  const ultimasDecisoes = dados.decisoes.slice(-4);
  if (ultimasDecisoes.length) {
    linhas.push("", "ÚLTIMAS MUDANÇAS DA SELIC META:");
    ultimasDecisoes.forEach((d) => linhas.push(`- ${formatarData(d.data)}: ${formatarPercentual(d.selic_anterior)} → ${formatarPercentual(d.selic_nova)}`));
  }
  linhas.push(...linhasContextoMercado(painel.mercado));
  if (painel.destaques.length) {
    linhas.push("", "DESTAQUES:", ...painel.destaques.map((d) => `- ${d.texto}`));
  }
  return linhas.join("\n");
}
