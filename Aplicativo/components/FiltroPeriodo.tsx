import Link from "next/link";
import { PERIODOS, ROTULOS_PERIODO, filtroParaQuery, type Filtro } from "@/lib/indicadores/filtro";

// Filtro por período via URL (funciona sem JavaScript e permite compartilhar o link).
export function FiltroPeriodo({ filtro, caminho }: { filtro: Filtro; caminho: string }) {
  const atalhos = PERIODOS.filter((p) => p !== "personalizado");
  return (
    <div className="filtros" role="group" aria-label="Período">
      {atalhos.map((periodo) => (
        <Link
          key={periodo}
          href={`${caminho}?${filtroParaQuery({ ...filtro, periodo })}`}
          aria-current={filtro.periodo === periodo ? "true" : undefined}
        >
          {ROTULOS_PERIODO[periodo]}
        </Link>
      ))}
      <form method="get" action={caminho}>
        <input type="hidden" name="periodo" value="personalizado" />
        <label>
          Início
          <input type="date" name="inicio" defaultValue={filtro.inicio} required />
        </label>
        <label>
          Fim
          <input type="date" name="fim" defaultValue={filtro.fim} required />
        </label>
        <button type="submit" className="botao secundario">
          Aplicar
        </button>
      </form>
    </div>
  );
}
