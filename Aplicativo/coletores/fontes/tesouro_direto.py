"""Coletor do Tesouro Direto (Tesouro Transparente, dados abertos): preços e taxas diários."""

from __future__ import annotations

import csv
import io
from datetime import date
from typing import Any, Iterable, Iterator

import requests

from ..comum.numeros import data_br, decimal_br, validar_cabecalho
from ..comum.supabase import ClienteSupabase

URL_CSV = (
    "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/"
    "resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv"
)
CABECALHO = [
    "Tipo Titulo", "Data Vencimento", "Data Base", "Taxa Compra Manha", "Taxa Venda Manha",
    "PU Compra Manha", "PU Venda Manha", "PU Base Manha",
]


def interpretar_csv(linhas_texto: Iterable[str], a_partir_de: date | None) -> Iterator[dict[str, Any]]:
    """Lê o CSV (separador ';', decimais com vírgula) e devolve só as datas após `a_partir_de`."""
    leitor = csv.reader(linhas_texto, delimiter=";")
    validar_cabecalho(next(leitor), CABECALHO, "Tesouro Direto")
    for colunas in leitor:
        if not colunas:
            continue
        titulo, vencimento, data_base, tx_compra, tx_venda, pu_compra, pu_venda, pu_base = colunas
        data = data_br(data_base)
        if a_partir_de and data <= a_partir_de:
            continue
        yield {
            "data": data,
            "titulo": titulo.strip(),
            "vencimento": data_br(vencimento),
            "taxa_compra": decimal_br(tx_compra),
            "taxa_venda": decimal_br(tx_venda),
            "pu_compra": decimal_br(pu_compra),
            "pu_venda": decimal_br(pu_venda),
            "pu_base": decimal_br(pu_base),
        }


def coletar(cliente: ClienteSupabase, hoje: date, sessao: requests.Session | None = None) -> int:
    sessao = sessao or requests.Session()
    ultima = cliente.ultima_data("tesouro_direto")
    resposta = sessao.get(URL_CSV, timeout=180)
    resposta.raise_for_status()
    texto = io.StringIO(resposta.content.decode("latin-1"))
    return cliente.upsert("tesouro_direto", interpretar_csv(texto, ultima), "data,titulo,vencimento")
