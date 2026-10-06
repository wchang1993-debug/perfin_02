// Chamadas REST às APIs do Google com tratamento explícito de erro.

export class ErroGoogle extends Error {
  constructor(
    public readonly status: number,
    public readonly servico: string,
  ) {
    super(`Falha ao acessar ${servico} (HTTP ${status}).`);
  }
}

// O Google recusou o refresh token (revogado ou expirado: em modo Teste expira em 7 dias).
export class ErroConexaoGoogleExpirada extends Error {
  constructor() {
    super("Sua conexão com o Google expirou. Entre novamente.");
  }
}

export async function chamarGoogle(
  accessToken: string,
  servico: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const resposta = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, ...init.headers },
    cache: "no-store",
  });
  if (resposta.status === 401) throw new ErroConexaoGoogleExpirada();
  if (!resposta.ok) throw new ErroGoogle(resposta.status, servico);
  return resposta;
}

export async function chamarGoogleJson<T>(
  accessToken: string,
  servico: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const resposta = await chamarGoogle(accessToken, servico, url, init);
  return (await resposta.json()) as T;
}
