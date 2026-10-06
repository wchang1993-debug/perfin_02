"""Download de arquivos das fontes, com tratamento uniforme de "ainda não publicado"."""

from __future__ import annotations

import requests

TIMEOUT_SEGUNDOS = 60
# Algumas fontes recusam clientes sem User-Agent de navegador.
CABECALHOS = {"User-Agent": "Mozilla/5.0 (compatible; PortalPerfin/1.0; coleta interna)"}
# Abaixo disso o "arquivo" é uma página vazia ou de erro (dia sem publicação).
TAMANHO_MINIMO = 200


def nova_sessao() -> requests.Session:
    sessao = requests.Session()
    sessao.headers.update(CABECALHOS)
    return sessao


def baixar_texto(
    sessao: requests.Session,
    url: str,
    *,
    dados: dict[str, str] | None = None,
    codificacao: str = "latin-1",
) -> str | None:
    """Devolve o conteúdo em texto, ou None se a fonte ainda não publicou (404 ou corpo vazio)."""
    if dados is None:
        resposta = sessao.get(url, timeout=TIMEOUT_SEGUNDOS)
    else:
        resposta = sessao.post(url, data=dados, timeout=TIMEOUT_SEGUNDOS)
    if resposta.status_code == 404:
        return None
    resposta.raise_for_status()
    if len(resposta.content) < TAMANHO_MINIMO:
        return None
    return resposta.content.decode(codificacao)
