import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { formatarData, formatarPercentual, formatarPp } from "@/lib/formatacao";
import { acumuladoPeriodo, decisoesCopom, serie } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { mesclarSeries } from "@/lib/indicadores/graficos";

export const metadata = { title: "Juros e curvas" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Juros({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const { inicio, fim } = filtro;
  const [selic, cdiAa, cdiPeriodo, decisoes] = await Promise.all([
    serie("SELIC", inicio, fim),
    serie("CDI_AA", inicio, fim),
    acumuladoPeriodo("CDI", inicio, fim),
    decisoesCopom(inicio, fim),
  ]);

  return (
    <>
      <p className="rotulo">Juros</p>
      <h1>Juros e curvas</h1>
      <FiltroPeriodo filtro={filtro} caminho="/juros" />
      <div className="grade-2">
        <section className="painel">
          <Grafico
            titulo="Selic meta e CDI (% a.a.)"
            tipo="degraus"
            dados={mesclarSeries({ SELIC: selic, CDI: cdiAa })}
            series={[{ chave: "SELIC", nome: "Selic meta" }, { chave: "CDI", nome: "CDI" }]}
          />
          <p className="suave pequeno">CDI acumulado no período: {formatarPercentual(cdiPeriodo)}.</p>
        </section>
        <section className="painel">
          <h2>Decisões do Copom no período</h2>
          {decisoes.length === 0 ? (
            <p className="suave">Nenhuma mudança da Selic meta no período.</p>
          ) : (
            <ul className="lista-filetes">
              {[...decisoes].reverse().map((d) => (
                <li key={d.data}>
                  {formatarData(d.data)}: {formatarPercentual(d.selic_anterior)} → {formatarPercentual(d.selic_nova)} ({formatarPp(d.variacao_pp)})
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="painel">
        <h2>Curvas de juros (ETTJ ANBIMA e DI1 B3)</h2>
        <p className="suave">
          Curvas pré, real e inflação implícita, deslocamentos em bps, inclinação 10a − 2a e taxas a termo do DI1
          ficam disponíveis quando a coleta ANBIMA/B3 for ativada (ondas 2 e 3). As tabelas e funções de cálculo
          (Svensson, taxa DI1 e termo) já estão no banco.
        </p>
      </section>
    </>
  );
}
