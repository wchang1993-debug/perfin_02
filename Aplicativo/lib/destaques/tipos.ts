export type Severidade = "atencao" | "informativo";

export interface Destaque {
  id: string;
  severidade: Severidade;
  // 0 = comum, 1 = sequência/limiar relevante, 2 = recorde. Usado para priorizar.
  raridade: number;
  texto: string;
}

export const MAXIMO_DESTAQUES = 6;

export function priorizar(destaques: Destaque[], maximo = MAXIMO_DESTAQUES): Destaque[] {
  const peso = (d: Destaque) => (d.severidade === "atencao" ? 10 : 0) + d.raridade;
  return [...destaques].sort((a, b) => peso(b) - peso(a)).slice(0, maximo);
}
