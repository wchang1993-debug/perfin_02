import type { Destaque } from "@/lib/destaques/tipos";

export function ListaDestaques({ destaques }: { destaques: Destaque[] }) {
  if (destaques.length === 0) {
    return <p className="suave">Sem destaques para o período: ainda não há dados suficientes.</p>;
  }
  return (
    <ul className="lista-filetes">
      {destaques.map((d) => (
        <li key={d.id} className={d.severidade === "atencao" ? "destaque-atencao" : undefined}>
          {d.severidade === "atencao" && <span className="rotulo">Atenção · </span>}
          {d.texto}
        </li>
      ))}
    </ul>
  );
}
