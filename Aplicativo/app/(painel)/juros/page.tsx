import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { SemDadosMercado } from "@/components/SemDadosMercado";
import { TabelaDeslocamentos } from "@/components/TabelaDeslocamentos";
import { formatarData, formatarPercentual, formatarPp } from "@/lib/formatacao";
import { acumuladoPeriodo, decisoesCopom, serie } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { mesclarSeries } from "@/lib/indicadores/graficos";
import { curvaCompleta, dataCurvaAnterior, datasMercado, deslocamentoCurvas, historicoVertices } from "@/lib/mercado/consultas";
import { mesclarCurvas } from "@/lib/mercado/curvas";
import type { VerticeChave } from "@/lib/mercado/tipos";

export const metadata = { title: "Juros e curvas" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Curvas de hoje, de 1 mês (21 pregões) e de 1 ano (252 pregões) atrás, para comparação.
async function curvasComparadas(data: string): Promise<Record<string, VerticeChave[]>> {
  const [mes, ano] = await Promise.all([dataCurvaAnterior(data, 21), dataCurvaAnterior(data, 252)]);
  const [hoje, curvaMes, curvaAno] = await Promise.all([
    curvaCompleta(data),
    mes ? curvaCompleta(mes) : [],
    ano ? curvaCompleta(ano) : [],
  ]);
  return { [formatarData(data)]: hoje, ...(mes ? { [formatarData(mes)]: curvaMes } : {}), ...(ano ? { [formatarData(ano)]: curvaAno } : {}) };
}

export default async function Juros({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const { inicio, fim } = filtro;
  const [selic, cdiAa, cdiPeriodo, decisoes, datas] = await Promise.all([
    serie("SELIC", inicio, fim),
    serie("CDI_AA", inicio, fim),
    acumuladoPeriodo("CDI", inicio, fim),
    decisoesCopom(inicio, fim),
    datasMercado(),
  ]);
  const dataCurva = datas.curvas;
  const [curvas, deslocamentos, historico] = dataCurva
    ? await Promise.all([curvasComparadas(dataCurva), deslocamentoCurvas(dataCurva), historicoVertices(inicio, fim)])
    : [{}, [], []];
  const rotulosCurvas = Object.keys(curvas).map((r) => ({ chave: r, nome: r }));

  return (
    <>
      <p className="rotulo">Juros</p>
      <h1>Juros e curvas</h1>
      <FiltroPeriodo filtro={filtro} caminho="/juros" />

      <section className="painel">
        <h2>Curvas de juros ANBIMA (ETTJ){dataCurva ? ` — ${formatarData(dataCurva)}` : ""}</h2>
        {!dataCurva ? (
          <SemDadosMercado fonte="curvas de juros" />
        ) : (
          <>
            <div className="grade-2">
              <Grafico titulo="Curva pré (% a.a.)" eixo="prazo" dados={mesclarCurvas(curvas, "pre")} series={rotulosCurvas} />
              <Grafico titulo="Curva real — IPCA+ (% a.a.)" eixo="prazo" dados={mesclarCurvas(curvas, "real")} series={rotulosCurvas} />
            </div>
            <h3 style={{ marginTop: 24 }}>Vértices e deslocamentos</h3>
            <TabelaDeslocamentos linhas={deslocamentos} />
            <div className="grade-2" style={{ marginTop: 24 }}>
              <Grafico
                titulo="Inclinação da curva pré: 10 anos − 2 anos (bps)"
                formato="numero"
                dados={historico.map((h) => ({ data: h.data, inclinacao: h.inclinacao_bps }))}
                series={[{ chave: "inclinacao", nome: "10a − 2a" }]}
              />
              <Grafico
                titulo="Juro real e inflação implícita de 5 anos (% a.a.)"
                dados={historico.map((h) => ({ data: h.data, real: h.real_5a, implicita: h.implicita_5a }))}
                series={[{ chave: "real", nome: "Real 5a" }, { chave: "implicita", nome: "Implícita 5a" }]}
              />
            </div>
          </>
        )}
      </section>

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
      <p className="suave pequeno">A curva de DI1 da B3 e as taxas a termo entram quando a fonte da B3 estiver disponível.</p>
    </>
  );
}
