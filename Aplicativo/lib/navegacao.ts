// Itens do menu do Portal (lateral no desktop; os marcados com `inferior` vão para a barra do celular).
export interface ItemNavegacao {
  href: string;
  rotulo: string;
  inferior: boolean;
}

export const ITENS_NAVEGACAO: ItemNavegacao[] = [
  { href: "/", rotulo: "Visão geral", inferior: true },
  { href: "/inflacao", rotulo: "Inflação", inferior: true },
  { href: "/juros", rotulo: "Juros e curvas", inferior: true },
  { href: "/cambio", rotulo: "Câmbio", inferior: false },
  { href: "/titulos", rotulo: "Títulos públicos", inferior: false },
  { href: "/comparativo", rotulo: "Comparativo", inferior: true },
  { href: "/credito", rotulo: "Crédito privado", inferior: false },
  { href: "/indices", rotulo: "Índices ANBIMA", inferior: false },
  { href: "/futuros", rotulo: "Futuros B3", inferior: false },
  { href: "/relatorios", rotulo: "Relatórios", inferior: false },
  { href: "/agenda", rotulo: "Agenda", inferior: false },
];

export const ITEM_MAIS: ItemNavegacao = { href: "/mais", rotulo: "Mais", inferior: true };
