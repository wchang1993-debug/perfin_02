import { percentualDoCdi } from "@/lib/indicadores/percentual-cdi";
import type { Simulacao } from "@/lib/indicadores/tipos";
import type { DesempenhoIndice } from "@/lib/mercado/tipos";

// Referências do comparativo (regra A3.18): indicadores do BCB e índices ANBIMA no mesmo ranking.

export const REFERENCIAS_BCB = [
  { codigo: "CDI", nome: "CDI" },
  { codigo: "POUP", nome: "Poupança" },
  { codigo: "IPCA", nome: "IPCA" },
  { codigo: "USD", nome: "Dólar" },
] as const;

export const REFERENCIAS_ANBIMA = ["IMA-B", "IRF-M", "IMA-S"] as const;

export interface LinhaComparativo {
  chave: string;
  nome: string;
  fonte: "BCB" | "ANBIMA";
  rentabilidade: number;
  valorFinal: number;
  percentualCdi: number | null;
}

export function unirComparativo(bcb: Simulacao[], anbima: DesempenhoIndice[]): LinhaComparativo[] {
  const cdi = bcb.find((s) => s.codigo === "CDI")?.rentabilidade ?? null;
  const linhas: LinhaComparativo[] = [
    ...bcb.map((s) => ({
      chave: s.codigo,
      nome: REFERENCIAS_BCB.find((r) => r.codigo === s.codigo)?.nome ?? s.nome,
      fonte: "BCB" as const,
      rentabilidade: s.rentabilidade,
      valorFinal: s.valor_final,
      percentualCdi: s.codigo === "CDI" ? 100 : percentualDoCdi(s.rentabilidade, cdi),
    })),
    ...anbima.map((d) => ({
      chave: d.indice,
      nome: d.indice,
      fonte: "ANBIMA" as const,
      rentabilidade: d.rentabilidade,
      valorFinal: d.valor_final,
      percentualCdi: percentualDoCdi(d.rentabilidade, cdi),
    })),
  ];
  return linhas.sort((a, b) => b.rentabilidade - a.rentabilidade);
}
