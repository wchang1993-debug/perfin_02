import { EmBreve } from "@/components/EmBreve";

export const metadata = { title: "Índices ANBIMA" };

export default function Pagina() {
  return (
    <EmBreve
      titulo="Índices ANBIMA"
      onda="onda 2"
      itens={[
        "IRF-M, IRF-M 1 e 1+, IMA-B, IMA-B 5 e 5+, IMA-S, IMA-Geral e IDA",
        "Retornos no dia, mês, ano e 12 meses, e em % do CDI",
        "Duration média de cada índice",
        "Entrada dos índices no comparativo base 100",
      ]}
    />
  );
}
