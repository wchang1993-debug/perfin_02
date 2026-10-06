// Normaliza NEXT_PUBLIC_SITE_URL para a origem pública do Portal (ex.: https://nome.vercel.app).
// O valor monta as URLs de retorno do login: um erro aqui quebra o OAuth sem mensagem clara,
// por isso falhamos cedo, com o motivo, e aceitamos variações comuns (espaços, barra final).
export function normalizarUrlSite(valor: string | undefined): string {
  const texto = (valor ?? "").trim();
  if (!texto) throw new Error("NEXT_PUBLIC_SITE_URL não definida.");

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL inválida: use o endereço completo, ex.: https://nome.vercel.app");
  }
  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL deve usar https (o Portal roda só na URL pública da Vercel).");
  }
  if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("NEXT_PUBLIC_SITE_URL deve ser só o domínio, sem caminho, parâmetros ou credenciais.");
  }
  return url.origin;
}
