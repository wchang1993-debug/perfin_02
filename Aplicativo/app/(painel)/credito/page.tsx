import { EmBreve } from "@/components/EmBreve";

export const metadata = { title: "Crédito privado" };

export default function Pagina() {
  return (
    <EmBreve
      titulo="Crédito privado (debêntures)"
      onda="onda 3"
      itens={[
        "Spread de crédito sobre a NTN-B de referência (IPCA+), DI+ e %DI",
        "Mediana e quartis por indexador e faixa de duration",
        "Histórico da mediana: spreads abrindo ou fechando",
        "Maiores aberturas e fechamentos do dia por emissor",
        "Busca por código ou emissor",
      ]}
    />
  );
}
