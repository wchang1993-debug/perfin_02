// Junta várias séries em linhas por data, no formato que os gráficos esperam: { data, A: v, B: v }.
export function mesclarSeries(
  series: Record<string, { data: string; valor: number | null }[]>,
): Record<string, string | number | null>[] {
  const porData = new Map<string, Record<string, string | number | null>>();
  for (const [chave, pontos] of Object.entries(series)) {
    for (const ponto of pontos) {
      const linha = porData.get(ponto.data) ?? { data: ponto.data };
      linha[chave] = ponto.valor;
      porData.set(ponto.data, linha);
    }
  }
  return [...porData.values()].sort((a, b) => String(a.data).localeCompare(String(b.data)));
}

// Diferença ponto a ponto entre duas séries na mesma data (ex.: spread IGP-M − IPCA em p.p.).
export function diferencaSeries(
  a: { data: string; valor: number }[],
  b: { data: string; valor: number }[],
): { data: string; valor: number }[] {
  const porData = new Map(b.map((p) => [p.data, p.valor]));
  return a.flatMap((p) => {
    const outro = porData.get(p.data);
    return outro === undefined ? [] : [{ data: p.data, valor: p.valor - outro }];
  });
}
