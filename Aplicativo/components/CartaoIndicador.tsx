import type { DadosCartao } from "@/lib/indicadores/cartoes";

export function CartaoIndicador({ rotulo, valor, detalhe, referencia, selo }: DadosCartao) {
  return (
    <article className="cartao">
      <p className="rotulo" style={{ margin: 0 }}>
        {rotulo}
      </p>
      <p className="valor">{valor}</p>
      {detalhe && <p className="variacao" style={{ margin: 0 }}>{detalhe}</p>}
      {selo && <span className={`selo${selo.atencao ? " atencao" : ""}`}>{selo.texto}</span>}
      {referencia && (
        <p className="suave pequeno" style={{ margin: "6px 0 0" }}>
          {referencia}
        </p>
      )}
    </article>
  );
}
