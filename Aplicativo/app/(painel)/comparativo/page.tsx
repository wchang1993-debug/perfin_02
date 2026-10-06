import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { formatarPercentual, formatarReais } from "@/lib/formatacao";
import { serieBase100, simulacao10mil } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { mesclarSeries } from "@/lib/indicadores/graficos";
import type { CodigoIndicador } from "@/lib/indicadores/tipos";

export const metadata = { title: "Comparativo" };

const ATIVOS: { codigo: CodigoIndicador; nome: string }[] = [
  { codigo: "CDI", nome: "CDI" },
  { codigo: "POUP", nome: "Poupança" },
  { codigo: "IPCA", nome: "IPCA" },
  { codigo: "USD", nome: "Dólar" },
];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Comparativo({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const codigos = ATIVOS.map((a) => a.codigo);
  const [base100, simulacao] = await Promise.all([
    serieBase100(codigos, filtro.inicio, filtro.fim),
    simulacao10mil(codigos, filtro.inicio, filtro.fim),
  ]);
  const porCodigo = Object.fromEntries(ATIVOS.map((a) => [a.codigo, base100.filter((p) => p.codigo === a.codigo)]));

  return (
    <>
      <p className="rotulo">Comparativo</p>
      <h1>Quanto rendeu cada referência</h1>
      <FiltroPeriodo filtro={filtro} caminho="/comparativo" />
      <section className="painel">
        <Grafico
          titulo="Número-índice (base 100 no início do período)"
          formato="numero"
          dados={mesclarSeries(porCodigo)}
          series={ATIVOS.map((a) => ({ chave: a.codigo, nome: a.nome }))}
        />
      </section>
      <section className="painel">
        <h2>R$ 10.000 aplicados no início do período</h2>
        {simulacao.length === 0 ? (
          <p className="suave">Sem dados no período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Posição</th>
                <th>Referência</th>
                <th className="num">Rentabilidade</th>
                <th className="num">Valor final</th>
              </tr>
            </thead>
            <tbody>
              {simulacao.map((s, i) => (
                <tr key={s.codigo}>
                  <td>{i + 1}º</td>
                  <td>{ATIVOS.find((a) => a.codigo === s.codigo)?.nome ?? s.nome}</td>
                  <td className="num">{formatarPercentual(s.rentabilidade, 2, true)}</td>
                  <td className="num">{formatarReais(s.valor_final)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="suave pequeno">
          IPCA representa o valor apenas corrigido pela inflação. IMA-B, IRF-M, IMA-S e IDA entram com a coleta ANBIMA (onda 2).
        </p>
      </section>
    </>
  );
}
