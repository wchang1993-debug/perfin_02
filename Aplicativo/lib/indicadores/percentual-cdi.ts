// % do CDI = r_ativo / r_CDI · 100, com os dois acumulados no mesmo período (regra A3.3).
// "n/d" (null) quando o CDI do período não é positivo.
export function percentualDoCdi(rentabilidade: number | null, cdi: number | null): number | null {
  if (rentabilidade === null || cdi === null || cdi <= 0) return null;
  return (rentabilidade / cdi) * 100;
}
