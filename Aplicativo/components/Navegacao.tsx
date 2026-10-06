"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ITEM_MAIS, ITENS_NAVEGACAO } from "@/lib/navegacao";

export function Navegacao({ variante }: { variante: "lateral" | "inferior" }) {
  const caminho = usePathname();
  const itens = variante === "inferior" ? [...ITENS_NAVEGACAO.filter((i) => i.inferior), ITEM_MAIS] : ITENS_NAVEGACAO;
  return (
    <nav aria-label="Navegação principal" className={variante === "lateral" ? "menu-lateral" : "menu-inferior"}>
      {itens.map((item) => (
        <Link key={item.href} href={item.href} aria-current={caminho === item.href ? "page" : undefined}>
          {item.rotulo}
        </Link>
      ))}
    </nav>
  );
}
