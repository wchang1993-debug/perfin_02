import { z } from "zod";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { SemDadosMercado } from "@/components/SemDadosMercado";
import { TabelaDebentures, TabelaResumoSpreads, TabelaVariacoesDebentures } from "@/components/TabelasCredito";
import { formatarData } from "@/lib/formatacao";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { mesclarSeries } from "@/lib/indicadores/graficos";
import {
  buscarDebentures,
  datasMercado,
  maioresVariacoesDebentures,
  medianaSpreadsHist,
  resumoSpreads,
} from "@/lib/mercado/consultas";

export const metadata = { title: "Crédito privado" };

// Busca só com letras, números e espaços: o termo vai para um filtro do PostgREST.
const esquemaBusca = z.string().trim().regex(/^[\p{L}\p{N} ]{2,40}$/u);

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Credito({ searchParams }: Props) {
  const parametros = await searchParams;
  const filtro = lerFiltro(parametros);
  const busca = esquemaBusca.safeParse(parametros.q);
  const datas = await datasMercado();
  const data = datas.debentures;
  if (!data) {
    return (
      <>
        <h1>Crédito privado (debêntures)</h1>
        <SemDadosMercado fonte="debêntures" />
      </>
    );
  }

  const [resumo, historico, variacoes, encontradas] = await Promise.all([
    resumoSpreads(data),
    medianaSpreadsHist(filtro.inicio, filtro.fim),
    maioresVariacoesDebentures(data, 10),
    busca.success ? buscarDebentures(data, busca.data) : Promise.resolve(null),
  ]);
  const porIndexador = (indexador: string) =>
    historico.filter((h) => h.indexador === indexador).map((h) => ({ data: h.data, valor: h.mediana }));

  return (
    <>
      <p className="rotulo">Crédito privado</p>
      <h1>Debêntures — {formatarData(data)}</h1>
      <FiltroPeriodo filtro={filtro} caminho="/credito" />

      <section className="painel">
        <h2>Spread de crédito por indexador e prazo</h2>
        <p className="suave pequeno">
          IPCA+: taxa indicativa menos a NTN-B de referência. DI+: o próprio spread sobre o DI. Prefixadas: taxa menos a
          curva pré ANBIMA na mesma duration.
        </p>
        <TabelaResumoSpreads linhas={resumo} />
      </section>

      <div className="grade-2">
        <section className="painel">
          <Grafico
            titulo="Mediana do spread no período (bps)"
            formato="numero"
            dados={mesclarSeries({ IPCA: porIndexador("IPCA+"), DI: porIndexador("DI+") })}
            series={[{ chave: "IPCA", nome: "IPCA+" }, { chave: "DI", nome: "DI+" }]}
          />
          <p className="suave pequeno">Mediana subindo = spreads abrindo (mais risco percebido); caindo = fechando.</p>
        </section>
        <section className="painel">
          <h2>Maiores variações do dia</h2>
          <TabelaVariacoesDebentures linhas={variacoes} />
        </section>
      </div>

      <section className="painel">
        <h2>Buscar debênture</h2>
        <form method="get" action="/credito" className="filtros">
          <label>
            Código ou emissor
            <input type="search" name="q" defaultValue={typeof parametros.q === "string" ? parametros.q : ""} minLength={2} maxLength={40} />
          </label>
          <button type="submit" className="botao secundario">
            Buscar
          </button>
        </form>
        {parametros.q !== undefined && !busca.success && (
          <p className="erro pequeno">Use de 2 a 40 letras, números ou espaços.</p>
        )}
        {encontradas && <TabelaDebentures linhas={encontradas} />}
      </section>
    </>
  );
}
