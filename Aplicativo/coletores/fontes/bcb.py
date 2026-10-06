"""Coletor do Banco Central (API SGS): indicadores do catálogo public.indicadores."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Iterator

import requests

from ..comum.numeros import ErroFormato, data_br, decimal_br
from ..comum.supabase import ClienteSupabase

URL_SGS = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados"
ANOS_CARGA_INICIAL = 5
# A SGS limita consultas de séries diárias a 10 anos; janelas menores dão folga.
DIAS_POR_JANELA = 365 * 5
# Reprocessa os últimos dias para capturar revisões publicadas pelo BCB.
DIAS_REVISAO = 10


def janelas(inicio: date, fim: date) -> Iterator[tuple[date, date]]:
    atual = inicio
    while atual <= fim:
        final = min(atual + timedelta(days=DIAS_POR_JANELA - 1), fim)
        yield atual, final
        atual = final + timedelta(days=1)


def interpretar_resposta(conteudo: Any, codigo: str) -> list[dict[str, Any]]:
    """Converte o JSON da SGS ([{"data": "dd/mm/aaaa", "valor": "0.56"}]) em linhas da tabela."""
    if not isinstance(conteudo, list):
        raise ErroFormato(f"SGS {codigo}: resposta não é uma lista")
    linhas = []
    for item in conteudo:
        if not isinstance(item, dict) or "data" not in item or "valor" not in item:
            raise ErroFormato(f"SGS {codigo}: item fora do formato {item!r}")
        valor: Decimal | None = decimal_br(str(item["valor"]))
        if valor is None:
            continue
        linhas.append({"indicador_codigo": codigo, "data": data_br(item["data"]), "valor": valor})
    return linhas


def baixar_serie(sessao: requests.Session, serie: int, inicio: date, fim: date) -> Any:
    resposta = sessao.get(
        URL_SGS.format(serie=serie),
        params={
            "formato": "json",
            "dataInicial": inicio.strftime("%d/%m/%Y"),
            "dataFinal": fim.strftime("%d/%m/%Y"),
        },
        timeout=60,
    )
    # A SGS responde 404 quando não há dados no intervalo (ex.: mês ainda não divulgado).
    if resposta.status_code == 404:
        return []
    resposta.raise_for_status()
    return resposta.json()


def coletar_indicador(cliente: ClienteSupabase, sessao: requests.Session, codigo: str, serie: int, hoje: date) -> int:
    ultima = cliente.ultima_data("indicadores_valores", {"indicador_codigo": f"eq.{codigo}"})
    inicio = ultima - timedelta(days=DIAS_REVISAO) if ultima else hoje - timedelta(days=365 * ANOS_CARGA_INICIAL)
    total = 0
    for ini, fim in janelas(inicio, hoje):
        linhas = interpretar_resposta(baixar_serie(sessao, serie, ini, fim), codigo)
        total += cliente.upsert("indicadores_valores", linhas, "indicador_codigo,data")
    return total


def coletar(cliente: ClienteSupabase, hoje: date, sessao: requests.Session | None = None) -> int:
    sessao = sessao or requests.Session()
    catalogo = cliente.selecionar("indicadores", {"select": "codigo,serie_sgs", "ativo": "eq.true"})
    if not catalogo:
        raise ErroFormato("Catálogo public.indicadores vazio: aplique as migrations antes da coleta")
    return sum(coletar_indicador(cliente, sessao, item["codigo"], item["serie_sgs"], hoje) for item in catalogo)
