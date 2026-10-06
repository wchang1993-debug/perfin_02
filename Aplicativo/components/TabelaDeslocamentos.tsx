import { formatarBps, formatarPercentual } from "@/lib/formatacao";
import { ROTULOS_PRAZO } from "@/lib/mercado/curvas";
import type { Deslocamento } from "@/lib/mercado/tipos";

// Vértices-chave das curvas e quanto andaram (bps) em 1 dia, 1 semana, 1 mês e 1 ano.
export function TabelaDeslocamentos({ linhas }: { linhas: Deslocamento[] }) {
  return (
    <div className="rolagem-tabela">
      <table>
        <thead>
          <tr>
            <th>Prazo</th>
            <th className="num">Pré</th>
            <th className="num">Δ 1d</th>
            <th className="num">Δ 1 sem</th>
            <th className="num">Δ 1 mês</th>
            <th className="num">Δ 1 ano</th>
            <th className="num">Real (IPCA+)</th>
            <th className="num">Δ 1 sem</th>
            <th className="num">Δ 1 mês</th>
            <th className="num">Implícita</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.du}>
              <td>{ROTULOS_PRAZO[l.du] ?? `${l.du} du`}</td>
              <td className="num">{formatarPercentual(l.pre)}</td>
              <td className="num">{formatarBps(l.pre_1d)}</td>
              <td className="num">{formatarBps(l.pre_5d)}</td>
              <td className="num">{formatarBps(l.pre_21d)}</td>
              <td className="num">{formatarBps(l.pre_252d)}</td>
              <td className="num">{formatarPercentual(l.real)}</td>
              <td className="num">{formatarBps(l.real_5d)}</td>
              <td className="num">{formatarBps(l.real_21d)}</td>
              <td className="num">{formatarPercentual(l.implicita)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
