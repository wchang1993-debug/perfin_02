import { EmBreve } from "@/components/EmBreve";

export const metadata = { title: "Futuros B3" };

export default function Pagina() {
  return (
    <EmBreve
      titulo="Futuros B3"
      onda="onda 3"
      itens={[
        "DI1: taxa implícita por vencimento e taxas a termo",
        "O que a curva precifica para a Selic",
        "DAP, DOL/WDO e IND: ajustes e variações",
        "Dólar futuro contra a PTAX",
      ]}
    />
  );
}
