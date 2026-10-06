import { formatarMes, formatarPercentual } from "@/lib/formatacao";
import type { Ponto, Ponto12m } from "@/lib/indicadores/tipos";

// Tabela mês a mês (mais recente primeiro) com o IPCA acumulado em 12 meses.
export function TabelaMensal({ series, ipca12 }: { series: Record<string, Ponto[]>; ipca12: Ponto12m[] }) {
  const nomes = Object.keys(series);
  const meses = [...new Set(Object.values(series).flatMap((s) => s.map((p) => p.data)))].sort().reverse();
  if (meses.length === 0) return <p className="suave">Sem dados no período.</p>;
  return (
    <div className="rolagem-tabela">
      <table>
        <thead>
          <tr>
            <th>Mês</th>
            {nomes.map((n) => (
              <th key={n} className="num">
                {n} (%)
              </th>
            ))}
            <th className="num">IPCA 12m (%)</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((mes) => (
            <tr key={mes}>
              <td>{formatarMes(mes)}</td>
              {nomes.map((n) => (
                <td key={n} className="num">
                  {formatarPercentual(series[n]?.find((p) => p.data === mes)?.valor)}
                </td>
              ))}
              <td className="num">{formatarPercentual(ipca12.find((p) => p.data === mes)?.acumulado_12m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
