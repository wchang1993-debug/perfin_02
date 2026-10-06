import { formatarBps, formatarData, formatarPercentual } from "@/lib/formatacao";
import { ROTULOS_PRAZO } from "@/lib/mercado/curvas";
import type { PainelMercado } from "@/lib/mercado/painel";

const MAXIMO_ITENS = 5;

// Resumo de mercado (ANBIMA/Tesouro) para o assistente: só agregados e top N, nunca as tabelas inteiras.
export function linhasContextoMercado(mercado: PainelMercado | null): string[] {
  if (!mercado) return ["", "MERCADO: sem dados ANBIMA coletados."];
  const { datas, dados } = mercado;
  const linhas = ["", "MERCADO (última data coletada de cada fonte; não segue o filtro de período):"];

  if (datas.curvas && dados.deslocamentos.length) {
    linhas.push(`Curvas ETTJ ANBIMA em ${formatarData(datas.curvas)} (taxa; Δ 1 semana e 1 mês em bps):`);
    dados.deslocamentos.forEach((v) =>
      linhas.push(
        `- ${ROTULOS_PRAZO[v.du] ?? `${v.du} du`}: pré ${formatarPercentual(v.pre)} (${formatarBps(v.pre_5d)}; ${formatarBps(v.pre_21d)}), ` +
          `real ${formatarPercentual(v.real)} (${formatarBps(v.real_5d)}; ${formatarBps(v.real_21d)}), implícita ${formatarPercentual(v.implicita)}`,
      ),
    );
  }
  const ntnbs = dados.titulos.filter((t) => t.tipo === "NTN-B");
  if (datas.titulos && ntnbs.length) {
    linhas.push(`NTN-B (taxa indicativa ANBIMA em ${formatarData(datas.titulos)}; Δ 1 mês):`);
    ntnbs.forEach((t) => linhas.push(`- ${formatarData(t.vencimento)}: IPCA + ${formatarPercentual(t.taxa_indicativa)} (${formatarBps(t.var_21d)})`));
  }
  if (dados.imaB?.variacaoMes != null) {
    linhas.push(`IMA-B no mês: ${formatarPercentual(dados.imaB.variacaoMes)} (${formatarPercentual(dados.imaB.percentualCdi, 0)} do CDI), em ${formatarData(datas.indices)}`);
  }
  const credito = dados.medianasIpca.at(-1);
  if (credito) {
    linhas.push(`Spread mediano das debêntures IPCA+ sobre a NTN-B: ${formatarBps(credito.mediana, false)} em ${formatarData(credito.data)} (${credito.quantidade} debêntures)`);
  }
  if (dados.variacoesDebentures.length) {
    linhas.push("Maiores variações de taxa de debêntures no último dia:");
    dados.variacoesDebentures
      .slice(0, MAXIMO_ITENS)
      .forEach((v) => linhas.push(`- ${v.codigo} (${v.emissor}, ${v.indexador}): ${formatarBps(v.variacao_bps)}`));
  }
  if (dados.spreadVarejo.length) {
    linhas.push("Spread do varejo (Tesouro Direto × indicativa ANBIMA):");
    dados.spreadVarejo
      .slice(0, MAXIMO_ITENS)
      .forEach((s) => linhas.push(`- ${s.titulo} ${formatarData(s.vencimento)}: ${formatarBps(s.spread_bps)}`));
  }
  return linhas;
}
