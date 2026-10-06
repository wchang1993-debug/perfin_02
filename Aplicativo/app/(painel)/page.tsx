import { AlertaDesatualizados } from "@/components/AlertaDesatualizados";
import { CartaoIndicador } from "@/components/CartaoIndicador";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { ListaDestaques } from "@/components/ListaDestaques";
import { montarCartoes } from "@/lib/indicadores/cartoes";
import { indicadoresDesatualizados } from "@/lib/indicadores/consultas";
import { lerFiltro } from "@/lib/indicadores/filtro";
import { montarPainel } from "@/lib/indicadores/painel";

export const metadata = { title: "Visão geral" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function VisaoGeral({ searchParams }: Props) {
  const filtro = lerFiltro(await searchParams);
  const [painel, desatualizados] = await Promise.all([montarPainel(filtro), indicadoresDesatualizados()]);

  return (
    <>
      <p className="rotulo">Visão geral</p>
      <h1>Indicadores e mercado</h1>
      <FiltroPeriodo filtro={filtro} caminho="/" />
      <AlertaDesatualizados itens={desatualizados} />
      <section className="grade-cartoes" aria-label="Indicadores principais">
        {montarCartoes(painel).map((cartao) => (
          <CartaoIndicador key={cartao.rotulo} {...cartao} />
        ))}
      </section>
      <section className="painel">
        <h2>Destaques</h2>
        <ListaDestaques destaques={painel.destaques} />
      </section>
      <p className="suave pequeno">
        Curvas de juros, títulos ANBIMA, índices IMA, debêntures e futuros B3 entram nos cartões quando a coleta
        dessas fontes for ativada (aguardando validação de licença).
      </p>
    </>
  );
}
