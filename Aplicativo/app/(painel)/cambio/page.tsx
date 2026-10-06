import { CartaoIndicador } from "@/components/CartaoIndicador";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { formatarData, formatarPercentual, formatarReais } from "@/lib/formatacao";
import { estatisticasCambio, serie } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { mesclarSeries } from "@/lib/indicadores/graficos";
import type { EstatisticasCambio } from "@/lib/indicadores/tipos";

export const metadata = { title: "Câmbio" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function Cartoes({ nome, e }: { nome: string; e: EstatisticasCambio | null }) {
  if (!e || e.ultimo === null) return <p className="suave">Sem dados de {nome} no período.</p>;
  return (
    <div className="grade-cartoes">
      <CartaoIndicador rotulo={`${nome} — último`} valor={formatarReais(e.ultimo, 4)} detalhe={`${formatarPercentual(e.variacao, 2, true)} no período`} />
      <CartaoIndicador rotulo="Máxima" valor={formatarReais(e.maximo, 4)} referencia={formatarData(e.data_maximo)} />
      <CartaoIndicador rotulo="Mínima" valor={formatarReais(e.minimo, 4)} referencia={formatarData(e.data_minimo)} />
      <CartaoIndicador rotulo="Volatilidade anualizada" valor={formatarPercentual(e.volatilidade_aa, 1)} detalhe={`Média: ${formatarReais(e.media, 4)}`} />
    </div>
  );
}

export default async function Cambio({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const { inicio, fim } = filtro;
  const [usd, eur, estUsd, estEur] = await Promise.all([
    serie("USD", inicio, fim),
    serie("EUR", inicio, fim),
    estatisticasCambio("USD", inicio, fim),
    estatisticasCambio("EUR", inicio, fim),
  ]);

  return (
    <>
      <p className="rotulo">Câmbio</p>
      <h1>Dólar e euro (PTAX)</h1>
      <FiltroPeriodo filtro={filtro} caminho="/cambio" />
      <Cartoes nome="Dólar" e={estUsd} />
      <Cartoes nome="Euro" e={estEur} />
      <section className="painel">
        <Grafico
          titulo="PTAX de venda (R$)"
          formato="cotacao"
          dados={mesclarSeries({ USD: usd, EUR: eur })}
          series={[{ chave: "USD", nome: "Dólar" }, { chave: "EUR", nome: "Euro" }]}
        />
      </section>
      <p className="suave pequeno">Dólar futuro × PTAX entra com a coleta de ajustes da B3 (onda 3).</p>
    </>
  );
}
