import { z } from "zod";

// Filtro comum das telas, lido da URL (?periodo=12m ou ?periodo=personalizado&inicio=…&fim=…).
export const PERIODOS = ["mes", "ano", "12m", "24m", "5a", "personalizado"] as const;
export type Periodo = (typeof PERIODOS)[number];

export const ROTULOS_PERIODO: Record<Periodo, string> = {
  mes: "Mês",
  ano: "No ano",
  "12m": "12 meses",
  "24m": "24 meses",
  "5a": "5 anos",
  personalizado: "Personalizado",
};

export interface Filtro {
  periodo: Periodo;
  inicio: string; // aaaa-mm-dd
  fim: string;
}

const ANOS_MAXIMOS = 10;
const dataIso = z.iso.date();

const esquemaUrl = z.object({
  periodo: z.enum(PERIODOS).catch("12m"),
  inicio: dataIso.optional().catch(undefined),
  fim: dataIso.optional().catch(undefined),
});

function iso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function deslocar(data: Date, meses: number, dias = 0): Date {
  const nova = new Date(data);
  nova.setUTCMonth(nova.getUTCMonth() + meses);
  nova.setUTCDate(nova.getUTCDate() + dias);
  return nova;
}

export function inicioDoPeriodo(periodo: Exclude<Periodo, "personalizado">, hoje: Date): Date {
  switch (periodo) {
    case "mes":
      return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
    case "ano":
      return new Date(Date.UTC(hoje.getUTCFullYear(), 0, 1));
    case "12m":
      return deslocar(hoje, -12, 1);
    case "24m":
      return deslocar(hoje, -24, 1);
    case "5a":
      return deslocar(hoje, -60, 1);
  }
}

// Converte os parâmetros da URL em um filtro válido; entradas inválidas caem no padrão (12 meses).
export function lerFiltro(
  parametros: Record<string, string | string[] | undefined>,
  hoje: Date = new Date(),
): Filtro {
  const bruto = Object.fromEntries(
    Object.entries(parametros).map(([chave, valor]) => [chave, Array.isArray(valor) ? valor[0] : valor]),
  );
  const { periodo, inicio, fim } = esquemaUrl.parse(bruto);
  const hojeUtc = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));

  if (periodo === "personalizado" && inicio && fim && inicio <= fim) {
    // Primeiro limita o fim a hoje; o teto de 10 anos conta a partir do fim efetivo.
    const fimEfetivo = fim > iso(hojeUtc) ? iso(hojeUtc) : fim;
    const limite = iso(deslocar(new Date(`${fimEfetivo}T00:00:00Z`), -12 * ANOS_MAXIMOS));
    const inicioEfetivo = inicio < limite ? limite : inicio;
    if (inicioEfetivo <= fimEfetivo) return { periodo, inicio: inicioEfetivo, fim: fimEfetivo };
  }
  const efetivo = periodo === "personalizado" ? "12m" : periodo;
  return { periodo: efetivo, inicio: iso(inicioDoPeriodo(efetivo, hojeUtc)), fim: iso(hojeUtc) };
}

export function filtroParaQuery(filtro: Filtro): string {
  const parametros = new URLSearchParams({ periodo: filtro.periodo });
  if (filtro.periodo === "personalizado") {
    parametros.set("inicio", filtro.inicio);
    parametros.set("fim", filtro.fim);
  }
  return parametros.toString();
}
