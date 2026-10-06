"""Carga do calendário de feriados nacionais em public.feriados."""

from __future__ import annotations

from datetime import date

from ..comum.calendario import feriados_nacionais
from ..comum.supabase import ClienteSupabase

ANO_INICIAL = 2000
ANO_FINAL = 2040


def linhas_feriados(ano_inicial: int = ANO_INICIAL, ano_final: int = ANO_FINAL) -> list[dict[str, object]]:
    return [
        {"data": dia, "descricao": descricao}
        for ano in range(ano_inicial, ano_final + 1)
        for dia, descricao in sorted(feriados_nacionais(ano).items())
    ]


def coletar(cliente: ClienteSupabase, hoje: date) -> int:
    return cliente.upsert("feriados", linhas_feriados(), "data")
