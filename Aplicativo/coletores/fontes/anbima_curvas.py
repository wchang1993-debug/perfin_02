"""Coletor ANBIMA — curvas de juros (ETTJ): parâmetros Svensson e vértices pré, real e implícita."""

from __future__ import annotations

from datetime import date
from typing import Any

import requests

from ..comum.calendario import dias_uteis_recentes
from ..comum.http import baixar_texto, nova_sessao
from ..comum.numeros import ErroFormato, data_br, decimal_br, validar_cabecalho
from ..comum.supabase import ClienteSupabase

URL = "https://www.anbima.com.br/informacoes/est-termo/CZ-down.asp"
DIAS_MAXIMOS = 5
CABECALHO_PARAMETROS = ["Beta 1", "Beta 2", "Beta 3", "Beta 4", "Lambda 1", "Lambda 2"]
CABECALHO_VERTICES = ["Vertices", "ETTJ IPCA", "ETTJ PREF", "Inflação Implícita"]
CURVA_POR_LINHA = {"PREFIXADOS": "pre", "IPCA": "real"}
CURVA_POR_COLUNA = {1: "real", 2: "pre", 3: "implicita"}


def _parametros(linhas: list[str], dia: date) -> list[dict[str, Any]]:
    primeira = linhas[0].split(";")
    validar_cabecalho(primeira[1:], CABECALHO_PARAMETROS, "ANBIMA curvas")
    resultado = []
    for linha in linhas[1:3]:
        c = linha.split(";")
        curva = CURVA_POR_LINHA.get(c[0].strip())
        if curva is None or len(c) != 7:
            raise ErroFormato(f"ANBIMA curvas: linha de parâmetros inesperada {c[0]!r}")
        valores = [decimal_br(v) for v in c[1:]]
        if any(v is None for v in valores):
            raise ErroFormato("ANBIMA curvas: parâmetro ausente")
        nomes = ["beta1", "beta2", "beta3", "beta4", "lambda1", "lambda2"]
        resultado.append({"data": dia, "curva": curva, **dict(zip(nomes, valores))})
    return resultado


def _vertices(linhas: list[str], dia: date) -> list[dict[str, Any]]:
    try:
        inicio = next(i for i, linha in enumerate(linhas) if linha.startswith("Vertices;ETTJ"))
    except StopIteration as erro:
        raise ErroFormato("ANBIMA curvas: seção de vértices não encontrada") from erro
    validar_cabecalho(linhas[inicio].split(";"), CABECALHO_VERTICES, "ANBIMA curvas")
    resultado = []
    for linha in linhas[inicio + 1:]:
        if not linha.strip():
            break
        c = linha.split(";")
        du = int(c[0].replace(".", ""))
        for coluna, curva in CURVA_POR_COLUNA.items():
            taxa = decimal_br(c[coluna]) if coluna < len(c) else None
            if taxa is not None:
                resultado.append({"data": dia, "curva": curva, "du": du, "taxa": taxa})
    return resultado


def interpretar(texto: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    linhas = texto.splitlines()
    dia = data_br(linhas[0].split(";")[0])
    return _parametros(linhas, dia), _vertices(linhas, dia)


def coletar(cliente: ClienteSupabase, hoje: date, sessao: requests.Session | None = None) -> int:
    sessao = sessao or nova_sessao()
    total = 0
    for dia in dias_uteis_recentes(hoje, cliente.ultima_data("curvas_parametros"), DIAS_MAXIMOS):
        texto = baixar_texto(sessao, URL, dados={"Idioma": "PT", "Dt_Ref": dia.strftime("%d/%m/%Y"), "saida": "csv"})
        if texto is None:
            continue
        parametros, vertices = interpretar(texto)
        # A ANBIMA devolve a última curva disponível quando a data pedida ainda não saiu.
        if parametros[0]["data"] != dia:
            continue
        total += cliente.upsert("curvas_parametros", parametros, "data,curva")
        total += cliente.upsert("curvas_vertices", vertices, "data,curva,du")
    return total
