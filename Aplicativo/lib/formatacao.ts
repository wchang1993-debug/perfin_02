// Formatação pt-BR. Recebe valores já calculados no banco; aqui só há apresentação.

type Numero = number | string | null | undefined;

const TRACO = "—";

function paraNumero(valor: Numero): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

function decimal(n: number, casas: number): string {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n);
}

export function formatarPercentual(valor: Numero, casas = 2, comSinal = false): string {
  const n = paraNumero(valor);
  if (n === null) return TRACO;
  const sinal = comSinal && n > 0 ? "+" : "";
  return `${sinal}${decimal(n, casas)}%`;
}

export function formatarPp(valor: Numero, casas = 2): string {
  const n = paraNumero(valor);
  if (n === null) return TRACO;
  return `${n > 0 ? "+" : ""}${decimal(n, casas)} p.p.`;
}

export function formatarBps(valor: Numero): string {
  const n = paraNumero(valor);
  if (n === null) return TRACO;
  return `${n > 0 ? "+" : ""}${decimal(n, 0)} bps`;
}

export function formatarReais(valor: Numero, casas = 2): string {
  const n = paraNumero(valor);
  if (n === null) return TRACO;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(n);
}

export function formatarNumero(valor: Numero, casas = 2): string {
  const n = paraNumero(valor);
  return n === null ? TRACO : decimal(n, casas);
}

// Datas ISO (aaaa-mm-dd) são tratadas como datas de calendário, sem fuso.
function dataIso(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(ano ?? 1970, (mes ?? 1) - 1, dia ?? 1));
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return TRACO;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(dataIso(iso));
}

export function formatarMes(iso: string | null | undefined): string {
  if (!iso) return TRACO;
  const texto = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
    .format(dataIso(iso))
    .replace(".", "")
    .replace(" de ", "/");
  return texto;
}

export function formatarDataHora(iso: string, fuso = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: fuso,
  }).format(new Date(iso));
}
