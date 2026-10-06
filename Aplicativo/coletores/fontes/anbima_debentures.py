"""Coletor ANBIMA — taxas indicativas de debêntures (arquivo diário dbAAMMDD.txt)."""

from __future__ import annotations

import re
from datetime import date
from decimal import ROUND_HALF_UP
from typing import Any, Iterator

import requests

from ..comum.calendario import dias_uteis_recentes
from ..comum.http import baixar_texto, nova_sessao
from ..comum.numeros import ErroFormato, data_br, decimal_br, validar_cabecalho
from ..comum.supabase import ClienteSupabase

URL = "https://www.anbima.com.br/informacoes/merc-sec-debentures/arqs/db{data:%y%m%d}.txt"
DIAS_MAXIMOS = 5
CABECALHO = [
    "Código", "Nome", "Repac./  Venc.", "Índice/ Correção", "Taxa de Compra", "Taxa de Venda", "Taxa Indicativa",
    "Desvio Padrão", "Intervalo Indicativo Minimo", "Intervalo Indicativo Máximo", "PU", "% PU Par / % VNE",
    "Duration", "% Reune", "Referência NTN-B",
]
# Grupos de indexador usados nas medianas de spread (regra A3.16).
PADROES_INDEXADOR = [
    (re.compile(r"^IPCA\s*\+"), "IPCA+"),
    (re.compile(r"^DI\s*\+"), "DI+"),
    (re.compile(r"%\s*do\s*DI", re.IGNORECASE), "%DI"),
    (re.compile(r"^PREFIXADO", re.IGNORECASE), "PRE"),
    (re.compile(r"^IGP-M", re.IGNORECASE), "IGP-M"),
]
MARCADORES_EMISSOR = re.compile(r"\s*\(\*+\)")


def indexador(texto: str) -> str:
    for padrao, grupo in PADROES_INDEXADOR:
        if padrao.search(texto.strip()):
            return grupo
    return "OUTRO"


def _data_opcional(texto: str) -> date | None:
    return data_br(texto) if texto.strip() else None


def _inteiro(texto: str) -> int | None:
    valor = decimal_br(texto)
    return int(valor.quantize(1, rounding=ROUND_HALF_UP)) if valor is not None else None


def interpretar(texto: str, dia: date) -> Iterator[dict[str, Any]]:
    linhas = [linha.split("@") for linha in texto.splitlines() if "@" in linha]
    if not linhas:
        raise ErroFormato("ANBIMA debêntures: arquivo sem dados")
    validar_cabecalho(linhas[0], CABECALHO, "ANBIMA debêntures")
    for c in linhas[1:]:
        if len(c) != len(CABECALHO):
            raise ErroFormato(f"ANBIMA debêntures: linha com {len(c)} colunas")
        indicativa = decimal_br(c[6])
        if indicativa is None:  # sem taxa indicativa no dia ("--")
            continue
        yield {
            "data": dia,
            "codigo": c[0].strip(),
            "emissor": MARCADORES_EMISSOR.sub("", c[1]).strip(),
            "vencimento": _data_opcional(c[2]),
            "indexador": indexador(c[3]),
            "taxa_compra": decimal_br(c[4]),
            "taxa_venda": decimal_br(c[5]),
            "taxa_indicativa": indicativa,
            "desvio_padrao": decimal_br(c[7]),
            "pu": decimal_br(c[10]),
            "pct_pu_par": decimal_br(c[11]),
            "duration_du": _inteiro(c[12]),
            "referencia_ntnb": _data_opcional(c[14]),
        }


def coletar(cliente: ClienteSupabase, hoje: date, sessao: requests.Session | None = None) -> int:
    sessao = sessao or nova_sessao()
    total = 0
    for dia in dias_uteis_recentes(hoje, cliente.ultima_data("debentures"), DIAS_MAXIMOS):
        texto = baixar_texto(sessao, URL.format(data=dia))
        if texto is not None:
            total += cliente.upsert("debentures", interpretar(texto, dia), "data,codigo")
    return total
