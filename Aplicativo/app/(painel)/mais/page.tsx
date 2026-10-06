import Link from "next/link";
import { ITENS_NAVEGACAO } from "@/lib/navegacao";

export const metadata = { title: "Mais" };

export default function Mais() {
  return (
    <>
      <h1>Todas as telas</h1>
      <ul className="lista-filetes painel">
        {ITENS_NAVEGACAO.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>{item.rotulo}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
