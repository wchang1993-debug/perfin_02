import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { SemDadosMercado } from "@/components/SemDadosMercado";
import { formatarData, formatarNumero, formatarPercentual, formatarReais } from "@/lib/formatacao";
import { acumuladoPeriodo } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { mesclarSeries } from "@/lib/indicadores/graficos";
import { percentualDoCdi } from "@/lib/indicadores/percentual-cdi";
import { datasMercado, indicesBase100, indicesDesempenho, indicesNaData } from "@/lib/mercado/consultas";

export const metadata = { title: "Índices ANBIMA" };

const INDICES_GRAFICO = ["IRF-M", "IMA-B", "IMA-B 5", "IMA-S", "IMA-GERAL"];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Indices({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const datas = await datasMercado();
  if (!datas.indices) {
    return (
      <>
        <h1>Índices ANBIMA</h1>
        <SemDadosMercado fonte="índices ANBIMA" />
      </>
    );
  }
  const [hoje, desempenho, base100, cdi] = await Promise.all([
    indicesNaData(datas.indices),
    indicesDesempenho(INDICES_GRAFICO, filtro.inicio, filtro.fim),
    indicesBase100(INDICES_GRAFICO, filtro.inicio, filtro.fim),
    acumuladoPeriodo("CDI", filtro.inicio, filtro.fim),
  ]);
  const porIndice = Object.fromEntries(INDICES_GRAFICO.map((i) => [i, base100.filter((p) => p.indice === i)]));

  return (
    <>
      <p className="rotulo">Renda fixa</p>
      <h1>Índices ANBIMA</h1>
      <FiltroPeriodo filtro={filtro} caminho="/indices" />
      <section className="painel">
        <h2>Fechamento de {formatarData(datas.indices)}</h2>
        <div className="rolagem-tabela">
          <table>
            <thead>
              <tr>
                <th>Índice</th>
                <th className="num">Número-índice</th>
                <th className="num">Dia</th>
                <th className="num">Mês</th>
                <th className="num">Ano</th>
                <th className="num">12 meses</th>
                <th className="num">Duration (du)</th>
              </tr>
            </thead>
            <tbody>
              {hoje.map((i) => (
                <tr key={i.indice}>
                  <td>{i.indice}</td>
                  <td className="num">{formatarNumero(i.numero_indice, 2)}</td>
                  <td className="num">{formatarPercentual(i.variacao_dia, 2, true)}</td>
                  <td className="num">{formatarPercentual(i.variacao_mes, 2, true)}</td>
                  <td className="num">{formatarPercentual(i.variacao_ano, 2, true)}</td>
                  <td className="num">{formatarPercentual(i.variacao_12m, 2, true)}</td>
                  <td className="num">{formatarNumero(i.duration_du, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="painel">
        <Grafico
          titulo="Base 100 no início do período"
          formato="numero"
          dados={mesclarSeries(porIndice)}
          series={INDICES_GRAFICO.map((i) => ({ chave: i, nome: i }))}
        />
        <h3 style={{ marginTop: 16 }}>No período (CDI: {formatarPercentual(cdi)})</h3>
        <table>
          <thead>
            <tr>
              <th>Índice</th>
              <th className="num">Rentabilidade</th>
              <th className="num">% do CDI</th>
              <th className="num">R$ 10.000 viraram</th>
            </tr>
          </thead>
          <tbody>
            {desempenho.map((d) => (
              <tr key={d.indice}>
                <td>{d.indice}</td>
                <td className="num">{formatarPercentual(d.rentabilidade, 2, true)}</td>
                <td className="num">{formatarPercentual(percentualDoCdi(d.rentabilidade, cdi), 0)}</td>
                <td className="num">{formatarReais(d.valor_final)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="suave pequeno">
          O histórico é acumulado a partir da primeira coleta (o arquivo público da ANBIMA traz só o último dia). O IDA
          (debêntures) ainda não é coletado.
        </p>
      </section>
    </>
  );
}
