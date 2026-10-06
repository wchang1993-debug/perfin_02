"""Coletor ANBIMA — família IMA (arquivo ima_completo.txt, sempre com o último dia publicado)."""

from __future__ import annotations

from datetime import date
from decimal import ROUND_HALF_UP
from typing import Any, Iterator

import requests

from ..comum.http import baixar_texto, nova_sessao
from ..comum.numeros import ErroFormato, data_br, decimal_br, validar_cabecalho
from ..comum.supabase import ClienteSupabase

URL = "https://www.anbima.com.br/informacoes/ima/arqs/ima_completo.txt"
CABECALHO = [
    "Data de Referência", "INDICE", "Número Índice", "Variação Diária(%)", "Variação Mensal(%)",
    "Variação Anual(%)", "Variação Últimos 12 Meses(%)", "Variação Últimos 24 Meses(%)", "Duration(d.u.)",
    "Peso(Geral)(%)", "Carteira a Mercado(R$ mil)", "Número de Operações *", "Quant. Negociada(1.000 títulos) *",
    "Valor Negociado(R$ mil) *", "PMR", "Convexidade", "Yield", "Redemption Yield",
]


def _inteiro(texto: str) -> int | None:
    valor = decimal_br(texto)
    return int(valor.quantize(1, rounding=ROUND_HALF_UP)) if valor is not None else None


def interpretar(texto: str) -> Iterator[dict[str, Any]]:
    # Seção "1@" = totais por índice; a seção "2@" (composição de carteira) não é usada.
    linhas = [linha.split("@")[1:] for linha in texto.splitlines() if linha.startswith("1@")]
    try:
        posicao = next(i for i, c in enumerate(linhas) if c and c[0] == "Data de Referência")
    except StopIteration as erro:
        raise ErroFormato("ANBIMA IMA: cabeçalho dos totais não encontrado") from erro
    validar_cabecalho(linhas[posicao], CABECALHO, "ANBIMA IMA")
    for c in linhas[posicao + 1:]:
        if len(c) != len(CABECALHO):
            raise ErroFormato(f"ANBIMA IMA: linha com {len(c)} colunas")
        numero = decimal_br(c[2])
        if numero is None:
            continue
        yield {
            "data": data_br(c[0]),
            "indice": c[1].strip(),
            "numero_indice": numero,
            "variacao_dia": decimal_br(c[3]),
            "variacao_mes": decimal_br(c[4]),
            "variacao_ano": decimal_br(c[5]),
            "variacao_12m": decimal_br(c[6]),
            "duration_du": _inteiro(c[8]),
        }


def coletar(cliente: ClienteSupabase, hoje: date, sessao: requests.Session | None = None) -> int:
    texto = baixar_texto(sessao or nova_sessao(), URL)
    if texto is None:
        return 0
    return cliente.upsert("indices_anbima", interpretar(texto), "data,indice")
