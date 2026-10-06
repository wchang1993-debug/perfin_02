import type { VerticeChave } from "./tipos";

export type CampoCurva = "pre" | "real" | "implicita";

// Junta a mesma curva em várias datas por prazo (du): { du, hoje: x, "1 mês": y, ... }.
export function mesclarCurvas(
  curvas: Record<string, VerticeChave[]>,
  campo: CampoCurva,
): Record<string, number | null>[] {
  const porPrazo = new Map<number, Record<string, number | null>>();
  for (const [rotulo, vertices] of Object.entries(curvas)) {
    for (const v of vertices) {
      const valor = v[campo];
      if (valor === null) continue;
      const linha = porPrazo.get(v.du) ?? { du: v.du };
      linha[rotulo] = valor;
      porPrazo.set(v.du, linha);
    }
  }
  return [...porPrazo.values()].sort((a, b) => Number(a.du) - Number(b.du));
}

export const ROTULOS_PRAZO: Record<number, string> = {
  126: "6 meses",
  252: "1 ano",
  504: "2 anos",
  756: "3 anos",
  1260: "5 anos",
  2520: "10 anos",
};
