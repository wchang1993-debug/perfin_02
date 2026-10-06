import Link from "next/link";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { Grafico } from "@/components/Grafico";
import { formatarData, formatarNumero, formatarPercentual, formatarReais } from "@/lib/formatacao";
import { filtroParaQuery, lerFiltro } from "@/lib/indicadores/filtro";
import { historicoTesouro, resumoTesouroDireto } from "@/lib/titulos/consultas";

export const metadata = { title: "Títulos públicos" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Titulos({ searchParams }: Props) {
  const parametros = await searchParams;
  const filtro = lerFiltro(parametros);
  const resumo = await resumoTesouroDireto();
  const chave = typeof parametros.titulo === "string" ? parametros.titulo : null;
  const selecionado = resumo.find((r) => `${r.titulo}|${r.vencimento}` === chave) ?? resumo[0] ?? null;
  const historico = selecionado
    ? await historicoTesouro(selecionado.titulo, selecionado.vencimento, filtro.inicio, filtro.fim)
    : [];

  return (
    <>
      <p className="rotulo">Títulos públicos</p>
      <h1>Tesouro Direto</h1>
      <FiltroPeriodo filtro={filtro} caminho="/titulos" />
      {resumo.length === 0 ? (
        <p className="aviso">Ainda não há dados do Tesouro Direto. Rode a coleta &quot;macro&quot; no GitHub Actions.</p>
      ) : (
        <>
          {selecionado && (
            <section className="painel">
              <Grafico
                titulo={`${selecionado.titulo} ${formatarData(selecionado.vencimento)} — taxa de venda (% a.a.)`}
                dados={historico.map((p) => ({ data: p.data, taxa: p.taxa_venda }))}
                series={[{ chave: "taxa", nome: "Taxa" }]}
              />
            </section>
          )}
          <section className="painel">
            <h2>Taxas em {formatarData(resumo[0]?.data)}</h2>
            <div className="rolagem-tabela">
              <table>
                <thead>
                  <tr>
                    <th>Título</th>
                    <th>Vencimento</th>
                    <th className="num">Taxa compra</th>
                    <th className="num">Taxa venda</th>
                    <th className="num">PU venda</th>
                    <th className="num">Mín. 12m</th>
                    <th className="num">Máx. 12m</th>
                    <th className="num">Média 5a</th>
                    <th className="num">Percentil 5a</th>
                  </tr>
                </thead>
                <tbody>
                  {resumo.map((r) => (
                    <tr key={`${r.titulo}|${r.vencimento}`}>
                      <td>
                        <Link href={`/titulos?${filtroParaQuery(filtro)}&titulo=${encodeURIComponent(`${r.titulo}|${r.vencimento}`)}`}>
                          {r.titulo}
                        </Link>
                      </td>
                      <td>{formatarData(r.vencimento)}</td>
                      <td className="num">{formatarPercentual(r.taxa_compra)}</td>
                      <td className="num">{formatarPercentual(r.taxa_venda)}</td>
                      <td className="num">{formatarReais(r.pu_venda)}</td>
                      <td className="num">{formatarPercentual(r.minimo_12m)}</td>
                      <td className="num">{formatarPercentual(r.maximo_12m)}</td>
                      <td className="num">{formatarPercentual(r.media_5a)}</td>
                      <td className="num">{formatarNumero(r.percentil_5a, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="suave pequeno">
              Percentil 5a: posição da taxa atual entre as taxas dos últimos 5 anos (100 = a maior). Taxas indicativas
              ANBIMA e o spread do varejo entram com a coleta ANBIMA (onda 2).
            </p>
          </section>
        </>
      )}
    </>
  );
}
