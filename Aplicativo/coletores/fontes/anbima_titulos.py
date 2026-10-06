"""Coletor ANBIMA — taxas indicativas de títulos públicos (arquivo diário msAAMMDD.txt)."""

from __future__ import annotations

from datetime import date
from typing import Any, Iterator

import requests

from ..comum.calendario import dias_uteis_recentes
from ..comum.http import baixar_texto, nova_sessao
from ..comum.numeros import ErroFormato, data_compacta, decimal_br, validar_cabecalho
from ..comum.supabase import ClienteSupabase

URL = "https://www.anbima.com.br/informacoes/merc-sec/arqs/ms{data:%y%m%d}.txt"
# O site mantém poucos dias publicados; buscamos só os mais recentes que faltam.
DIAS_MAXIMOS = 5
CABECALHO = [
    "Titulo", "Data Referencia", "Codigo SELIC", "Data Base/Emissao", "Data Vencimento", "Tx. Compra",
    "Tx. Venda", "Tx. Indicativas", "PU", "Desvio padrao", "Interv. Ind. Inf. (D0)", "Interv. Ind. Sup. (D0)",
    "Interv. Ind. Inf. (D+1)", "Interv. Ind. Sup. (D+1)", "Criterio",
]
TIPOS = {"LTN", "NTN-F", "NTN-B", "NTN-C", "LFT"}


def interpretar(texto: str) -> Iterator[dict[str, Any]]:
    linhas = [linha for linha in texto.splitlines() if "@" in linha]
    if not linhas:
        raise ErroFormato("ANBIMA títulos: arquivo sem dados")
    validar_cabecalho(linhas[0].split("@"), CABECALHO, "ANBIMA títulos")
    for linha in linhas[1:]:
        c = linha.split("@")
        if len(c) != len(CABECALHO):
            raise ErroFormato(f"ANBIMA títulos: linha com {len(c)} colunas")
        if c[0] not in TIPOS:
            raise ErroFormato(f"ANBIMA títulos: tipo desconhecido {c[0]!r}")
        indicativa, pu = decimal_br(c[7]), decimal_br(c[8])
        if indicativa is None or pu is None:
            continue
        yield {
            "data": data_compacta(c[1]),
            "tipo": c[0],
            "codigo_selic": c[2].strip(),
            "vencimento": data_compacta(c[4]),
            "taxa_compra": decimal_br(c[5]),
            "taxa_venda": decimal_br(c[6]),
            "taxa_indicativa": indicativa,
            "pu": pu,
            "desvio_padrao": decimal_br(c[9]),
            "intervalo_min": decimal_br(c[10]),
            "intervalo_max": decimal_br(c[11]),
        }


def coletar(cliente: ClienteSupabase, hoje: date, sessao: requests.Session | None = None) -> int:
    sessao = sessao or nova_sessao()
    total = 0
    for dia in dias_uteis_recentes(hoje, cliente.ultima_data("titulos_publicos"), DIAS_MAXIMOS):
        texto = baixar_texto(sessao, URL.format(data=dia))
        if texto is not None:
            total += cliente.upsert("titulos_publicos", interpretar(texto), "data,tipo,vencimento")
    return total
