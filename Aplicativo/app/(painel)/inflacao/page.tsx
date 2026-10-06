import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { TabelaMensal } from "@/components/TabelaMensal";
import { serie, serie12m, statusMeta } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { diferencaSeries, mesclarSeries } from "@/lib/indicadores/graficos";
import { historicoVertices } from "@/lib/mercado/consultas";
import { SemDadosMercado } from "@/components/SemDadosMercado";

export const metadata = { title: "Inflação" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Inflacao({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const { inicio, fim } = filtro;
  const [ipca, ipca15, inpc, igpm, ipca12, igpm12, meta, implicita] = await Promise.all([
    serie("IPCA", inicio, fim),
    serie("IPCA15", inicio, fim),
    serie("INPC", inicio, fim),
    serie("IGPM", inicio, fim),
    serie12m("IPCA", inicio, fim),
    serie12m("IGPM", inicio, fim),
    statusMeta(fim),
    historicoVertices(inicio, fim),
  ]);

  const mensal = mesclarSeries({ IPCA: ipca, IPCA15: ipca15, INPC: inpc, IGPM: igpm });

  const ipca12Pontos = ipca12.map((p) => ({ data: p.data, valor: p.acumulado_12m }));
  const igpm12Pontos = igpm12.map((p) => ({ data: p.data, valor: p.acumulado_12m }));
  const acumulado = mesclarSeries({ IPCA: ipca12Pontos, IGPM: igpm12Pontos });
  const spread = mesclarSeries({ SPREAD: diferencaSeries(igpm12Pontos, ipca12Pontos) });

  return (
    <>
      <p className="rotulo">Inflação</p>
      <h1>Inflação e meta</h1>
      <FiltroPeriodo filtro={filtro} caminho="/inflacao" />
      <div className="grade-2">
        <section className="painel">
          <Grafico
            titulo="IPCA e IGP-M em 12 meses (%)"
            dados={acumulado}
            series={[{ chave: "IPCA", nome: "IPCA 12m" }, { chave: "IGPM", nome: "IGP-M 12m" }]}
            faixa={meta ? { de: meta.piso, ate: meta.teto, rotulo: "Banda da meta" } : undefined}
          />
        </section>
        <section className="painel">
          <Grafico
            titulo="Variação mensal (%)"
            tipo="barras"
            dados={mensal}
            series={[
              { chave: "IPCA", nome: "IPCA" },
              { chave: "IPCA15", nome: "IPCA-15" },
              { chave: "INPC", nome: "INPC" },
              { chave: "IGPM", nome: "IGP-M" },
            ]}
          />
        </section>
        <section className="painel">
          <Grafico titulo="Spread IGP-M − IPCA em 12 meses (p.p.)" formato="numero" dados={spread} series={[{ chave: "SPREAD", nome: "Spread" }]} />
        </section>
        <section className="painel">
          {implicita.length === 0 ? (
            <>
              <h2>Inflação implícita (ETTJ ANBIMA)</h2>
              <SemDadosMercado fonte="curvas de juros" />
            </>
          ) : (
            <Grafico
              titulo="Inflação implícita de 5 anos — ETTJ ANBIMA (%)"
              dados={implicita.map((h) => ({ data: h.data, implicita: h.implicita_5a }))}
              series={[{ chave: "implicita", nome: "Implícita 5a" }]}
              faixa={meta ? { de: meta.piso, ate: meta.teto, rotulo: "Banda da meta" } : undefined}
            />
          )}
        </section>
      </div>
      <section className="painel">
        <h2>Mês a mês</h2>
        <TabelaMensal ipca12={ipca12} series={{ IPCA: ipca, "IPCA-15": ipca15, INPC: inpc, "IGP-M": igpm }} />
      </section>
    </>
  );
}
