import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { REFERENCIAS_ANBIMA, REFERENCIAS_BCB, unirComparativo } from "@/lib/comparativo";
import { formatarData, formatarPercentual, formatarReais } from "@/lib/formatacao";
import { serieBase100, simulacao10mil } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { mesclarSeries } from "@/lib/indicadores/graficos";
import { indicesBase100, indicesDesempenho } from "@/lib/mercado/consultas";

export const metadata = { title: "Comparativo" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Comparativo({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const codigosBcb = REFERENCIAS_BCB.map((r) => r.codigo);
  const indices = [...REFERENCIAS_ANBIMA];
  const [base100, simulacao, base100Indices, desempenhoIndices] = await Promise.all([
    serieBase100(codigosBcb, filtro.inicio, filtro.fim),
    simulacao10mil(codigosBcb, filtro.inicio, filtro.fim),
    indicesBase100(indices, filtro.inicio, filtro.fim),
    indicesDesempenho(indices, filtro.inicio, filtro.fim),
  ]);

  const series = {
    ...Object.fromEntries(codigosBcb.map((c) => [c, base100.filter((p) => p.codigo === c)])),
    ...Object.fromEntries(indices.map((i) => [i, base100Indices.filter((p) => p.indice === i)])),
  };
  const comIndices = indices.filter((i) => series[i]?.length);
  const ranking = unirComparativo(simulacao, desempenhoIndices);
  const inicioIndices = base100Indices.map((p) => p.data).sort()[0];

  return (
    <>
      <p className="rotulo">Comparativo</p>
      <h1>Quanto rendeu cada referência</h1>
      <FiltroPeriodo filtro={filtro} caminho="/comparativo" />
      <section className="painel">
        <Grafico
          titulo="Número-índice (base 100 no início do período)"
          formato="numero"
          dados={mesclarSeries(series)}
          series={[
            ...REFERENCIAS_BCB.map((r) => ({ chave: r.codigo, nome: r.nome })),
            ...comIndices.map((i) => ({ chave: i, nome: i })),
          ]}
        />
      </section>
      <section className="painel">
        <h2>R$ 10.000 aplicados no início do período</h2>
        {ranking.length === 0 ? (
          <p className="suave">Sem dados no período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Posição</th>
                <th>Referência</th>
                <th>Fonte</th>
                <th className="num">Rentabilidade</th>
                <th className="num">% do CDI</th>
                <th className="num">Valor final</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((l, i) => (
                <tr key={l.chave}>
                  <td>{i + 1}º</td>
                  <td>{l.nome}</td>
                  <td>{l.fonte}</td>
                  <td className="num">{formatarPercentual(l.rentabilidade, 2, true)}</td>
                  <td className="num">{formatarPercentual(l.percentualCdi, 0)}</td>
                  <td className="num">{formatarReais(l.valorFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="suave pequeno">
          IPCA representa o valor apenas corrigido pela inflação.{" "}
          {comIndices.length === 0
            ? "IMA-B, IRF-M e IMA-S aparecem quando a coleta ANBIMA estiver ativa."
            : inicioIndices && inicioIndices > filtro.inicio
              ? `Os índices ANBIMA começam em ${formatarData(inicioIndices)}, primeira data coletada no período: compare com cautela.`
              : ""}
        </p>
      </section>
    </>
  );
}
