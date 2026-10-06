import { formatarData } from "@/lib/formatacao";
import type { IndicadorDesatualizado } from "@/lib/indicadores/tipos";

export function AlertaDesatualizados({ itens }: { itens: IndicadorDesatualizado[] }) {
  if (itens.length === 0) return null;
  return (
    <div className="aviso" role="status">
      <strong>Dados desatualizados:</strong>{" "}
      {itens.map((i) => `${i.nome} (último: ${i.ultima_data ? formatarData(i.ultima_data) : "sem dados"})`).join("; ")}.
      {" "}Verifique a execução da coleta no GitHub Actions.
    </div>
  );
}
