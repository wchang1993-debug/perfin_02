import { formatarBps, formatarData, formatarPercentual, formatarReais } from "@/lib/formatacao";
import type { SpreadVarejo, TituloVariacao } from "@/lib/mercado/tipos";

// Taxas indicativas ANBIMA com variação em bps (1 dia, 1 semana, 1 mês).
export function TabelaTitulosAnbima({ titulos }: { titulos: TituloVariacao[] }) {
  return (
    <div className="rolagem-tabela">
      <table>
        <thead>
          <tr>
            <th>Título</th>
            <th>Vencimento</th>
            <th className="num">Taxa indicativa</th>
            <th className="num">PU</th>
            <th className="num">Intervalo indicativo</th>
            <th className="num">Δ 1d</th>
            <th className="num">Δ 1 sem</th>
            <th className="num">Δ 1 mês</th>
          </tr>
        </thead>
        <tbody>
          {titulos.map((t) => (
            <tr key={`${t.tipo}-${t.vencimento}`}>
              <td>{t.tipo}</td>
              <td>{formatarData(t.vencimento)}</td>
              <td className="num">{formatarPercentual(t.taxa_indicativa, 4)}</td>
              <td className="num">{formatarReais(t.pu)}</td>
              <td className="num">
                {formatarPercentual(t.intervalo_min)} a {formatarPercentual(t.intervalo_max)}
              </td>
              <td className="num">{formatarBps(t.var_1d)}</td>
              <td className="num">{formatarBps(t.var_5d)}</td>
              <td className="num">{formatarBps(t.var_21d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Taxa do Tesouro Direto (compra pelo investidor) contra a indicativa ANBIMA do título equivalente.
export function TabelaSpreadVarejo({ linhas }: { linhas: SpreadVarejo[] }) {
  if (linhas.length === 0) return <p className="suave">Sem datas em comum entre Tesouro Direto e ANBIMA.</p>;
  return (
    <div className="rolagem-tabela">
      <table>
        <thead>
          <tr>
            <th>Tesouro Direto</th>
            <th>Vencimento</th>
            <th>Equivalente ANBIMA</th>
            <th className="num">Taxa Tesouro</th>
            <th className="num">Taxa ANBIMA</th>
            <th className="num">Spread do varejo</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={`${l.titulo}-${l.vencimento}`}>
              <td>{l.titulo}</td>
              <td>{formatarData(l.vencimento)}</td>
              <td>{l.tipo_anbima}</td>
              <td className="num">{formatarPercentual(l.taxa_tesouro)}</td>
              <td className="num">{formatarPercentual(l.taxa_anbima)}</td>
              <td className="num">{formatarBps(l.spread_bps)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
