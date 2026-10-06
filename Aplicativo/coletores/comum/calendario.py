"""Calendário de feriados nacionais (regra ANBIMA) e contagem de dias úteis."""

from __future__ import annotations

from datetime import date, timedelta

# Dia Nacional de Zumbi e da Consciência Negra virou feriado nacional pela Lei 14.759/2023.
ANO_INICIO_CONSCIENCIA_NEGRA = 2024


def pascoa(ano: int) -> date:
    """Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher, calendário gregoriano)."""
    a = ano % 19
    b, c = divmod(ano, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mes, dia = divmod(h + l - 7 * m + 114, 31)
    return date(ano, mes, dia + 1)


def feriados_nacionais(ano: int) -> dict[date, str]:
    domingo_pascoa = pascoa(ano)
    feriados = {
        date(ano, 1, 1): "Confraternização Universal",
        domingo_pascoa - timedelta(days=48): "Carnaval",
        domingo_pascoa - timedelta(days=47): "Carnaval",
        domingo_pascoa - timedelta(days=2): "Paixão de Cristo",
        date(ano, 4, 21): "Tiradentes",
        date(ano, 5, 1): "Dia do Trabalho",
        domingo_pascoa + timedelta(days=60): "Corpus Christi",
        date(ano, 9, 7): "Independência do Brasil",
        date(ano, 10, 12): "Nossa Senhora Aparecida",
        date(ano, 11, 2): "Finados",
        date(ano, 11, 15): "Proclamação da República",
        date(ano, 12, 25): "Natal",
    }
    if ano >= ANO_INICIO_CONSCIENCIA_NEGRA:
        feriados[date(ano, 11, 20)] = "Dia Nacional de Zumbi e da Consciência Negra"
    return feriados


def eh_dia_util(dia: date, feriados: set[date]) -> bool:
    return dia.weekday() < 5 and dia not in feriados


def dias_uteis(inicio: date, fim: date, feriados: set[date]) -> int:
    """Dias úteis em (inicio, fim]: mesma convenção da função SQL public.dias_uteis."""
    total = 0
    dia = inicio + timedelta(days=1)
    while dia <= fim:
        if eh_dia_util(dia, feriados):
            total += 1
        dia += timedelta(days=1)
    return total
