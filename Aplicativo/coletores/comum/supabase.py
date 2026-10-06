"""Cliente mínimo do PostgREST do Supabase para os coletores (usa a secret key)."""

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal
from typing import Any, Iterable

import requests

TAMANHO_LOTE = 1000
TIMEOUT_SEGUNDOS = 60


def _serializar(valor: Any) -> Any:
    # Decimal vai como texto para o Postgres não perder precisão em numeric.
    if isinstance(valor, Decimal):
        return str(valor)
    if isinstance(valor, date):
        return valor.isoformat()
    raise TypeError(f"Tipo não serializável: {type(valor).__name__}")


class ClienteSupabase:
    def __init__(self, url: str, chave_secreta: str, sessao: requests.Session | None = None):
        self._base = url.rstrip("/") + "/rest/v1"
        self._sessao = sessao or requests.Session()
        self._sessao.headers.update({
            "apikey": chave_secreta,
            "Authorization": f"Bearer {chave_secreta}",
            "Content-Type": "application/json",
        })

    def selecionar(self, tabela: str, parametros: dict[str, str]) -> list[dict[str, Any]]:
        resposta = self._sessao.get(f"{self._base}/{tabela}", params=parametros, timeout=TIMEOUT_SEGUNDOS)
        resposta.raise_for_status()
        return resposta.json()

    def ultima_data(self, tabela: str, filtros: dict[str, str] | None = None) -> date | None:
        parametros = {"select": "data", "order": "data.desc", "limit": "1", **(filtros or {})}
        linhas = self.selecionar(tabela, parametros)
        return date.fromisoformat(linhas[0]["data"]) if linhas else None

    def upsert(self, tabela: str, linhas: Iterable[dict[str, Any]], conflito: str) -> int:
        """Insere ou atualiza em lotes (idempotente pela chave `conflito`). Retorna o total gravado."""
        lote: list[dict[str, Any]] = []
        total = 0
        for linha in linhas:
            lote.append(linha)
            if len(lote) == TAMANHO_LOTE:
                total += self._enviar_lote(tabela, lote, conflito)
                lote = []
        if lote:
            total += self._enviar_lote(tabela, lote, conflito)
        return total

    def inserir(self, tabela: str, linha: dict[str, Any]) -> dict[str, Any]:
        resposta = self._sessao.post(
            f"{self._base}/{tabela}",
            data=json.dumps(linha, default=_serializar),
            headers={"Prefer": "return=representation"},
            timeout=TIMEOUT_SEGUNDOS,
        )
        resposta.raise_for_status()
        return resposta.json()[0]

    def atualizar(self, tabela: str, filtros: dict[str, str], valores: dict[str, Any]) -> None:
        resposta = self._sessao.patch(
            f"{self._base}/{tabela}",
            params=filtros,
            data=json.dumps(valores, default=_serializar),
            timeout=TIMEOUT_SEGUNDOS,
        )
        resposta.raise_for_status()

    def _enviar_lote(self, tabela: str, lote: list[dict[str, Any]], conflito: str) -> int:
        resposta = self._sessao.post(
            f"{self._base}/{tabela}",
            params={"on_conflict": conflito},
            data=json.dumps(lote, default=_serializar),
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
            timeout=TIMEOUT_SEGUNDOS,
        )
        resposta.raise_for_status()
        return len(lote)
