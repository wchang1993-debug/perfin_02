import { formatarBps, formatarNumero, formatarPercentual } from "@/lib/formatacao";
import type { ResumoSpread, SpreadDebenture, VariacaoDebenture } from "@/lib/mercado/tipos";

export function TabelaResumoSpreads({ linhas }: { linhas: ResumoSpread[] }) {
  return (
    <div className="rolagem-tabela">
      <table>
        <thead>
          <tr>
            <th>Indexador</th>
            <th>Duration</th>
            <th className="num">Debêntures</th>
            <th className="num">1º quartil</th>
            <th className="num">Mediana</th>
            <th className="num">3º quartil</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={`${l.indexador}-${l.faixa}`}>
              <td>{l.faixa === "todas" ? <strong>{l.indexador}</strong> : ""}</td>
              <td>{l.faixa === "todas" ? "Todas" : l.faixa}</td>
              <td className="num">{l.quantidade}</td>
              <td className="num">{formatarBps(l.p25, false)}</td>
              <td className="num">{formatarBps(l.mediana, false)}</td>
              <td className="num">{formatarBps(l.p75, false)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TabelaVariacoesDebentures({ linhas }: { linhas: VariacaoDebenture[] }) {
  if (linhas.length === 0) return <p className="suave">É preciso ao menos dois dias coletados para medir variações.</p>;
  return (
    <div className="rolagem-tabela">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Emissor</th>
            <th>Indexador</th>
            <th className="num">Taxa anterior</th>
            <th className="num">Taxa atual</th>
            <th className="num">Variação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.codigo}>
              <td>{l.codigo}</td>
              <td>{l.emissor}</td>
              <td>{l.indexador}</td>
              <td className="num">{formatarPercentual(l.taxa_anterior, 4)}</td>
              <td className="num">{formatarPercentual(l.taxa_atual, 4)}</td>
              <td className="num">{formatarBps(l.variacao_bps)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TabelaDebentures({ linhas }: { linhas: SpreadDebenture[] }) {
  if (linhas.length === 0) return <p className="suave">Nenhuma debênture encontrada.</p>;
  return (
    <div className="rolagem-tabela">
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Emissor</th>
            <th>Indexador</th>
            <th className="num">Taxa indicativa</th>
            <th className="num">Spread</th>
            <th className="num">Duration (anos)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.codigo}>
              <td>{l.codigo}</td>
              <td>{l.emissor}</td>
              <td>{l.indexador}</td>
              <td className="num">{formatarPercentual(l.taxa_indicativa, 4)}</td>
              <td className="num">{formatarBps(l.spread_bps, false)}</td>
              <td className="num">{l.duration_du === null ? "—" : formatarNumero(l.duration_du / 252, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
