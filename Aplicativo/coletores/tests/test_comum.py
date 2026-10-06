from datetime import date
from decimal import Decimal

import pytest

from coletores.comum.calendario import dias_uteis, feriados_nacionais, pascoa
from coletores.comum.numeros import ErroFormato, data_br, decimal_br, validar_cabecalho


def test_decimal_br_converte_formato_brasileiro_e_ponto():
    assert decimal_br("1.234,56") == Decimal("1234.56")
    assert decimal_br("0,03") == Decimal("0.03")
    assert decimal_br("-0.32") == Decimal("-0.32")


def test_decimal_br_vazio_vira_none():
    assert decimal_br("") is None
    assert decimal_br(" - ") is None


def test_decimal_br_texto_invalido_falha_explicitamente():
    with pytest.raises(ErroFormato):
        decimal_br("abc")


def test_data_br_invalida_falha():
    assert data_br("05/10/2026") == date(2026, 10, 5)
    with pytest.raises(ErroFormato):
        data_br("2026-10-05")


def test_validar_cabecalho_detecta_mudanca_de_layout():
    validar_cabecalho([" A", "B "], ["A", "B"], "fonte")
    with pytest.raises(ErroFormato):
        validar_cabecalho(["B", "A"], ["A", "B"], "fonte")


@pytest.mark.parametrize("ano, esperado", [(2024, date(2024, 3, 31)), (2025, date(2025, 4, 20)), (2026, date(2026, 4, 5))])
def test_pascoa(ano, esperado):
    assert pascoa(ano) == esperado


def test_feriados_moveis_de_2026():
    feriados = feriados_nacionais(2026)
    assert date(2026, 2, 16) in feriados and date(2026, 2, 17) in feriados  # Carnaval
    assert date(2026, 4, 3) in feriados  # Paixão de Cristo
    assert date(2026, 6, 4) in feriados  # Corpus Christi


def test_consciencia_negra_so_a_partir_de_2024():
    assert date(2023, 11, 20) not in feriados_nacionais(2023)
    assert date(2024, 11, 20) in feriados_nacionais(2024)


def test_dias_uteis_desconta_fim_de_semana_e_carnaval():
    feriados = set(feriados_nacionais(2026))
    # (sex 13/02, sex 20/02]: seg e ter são Carnaval -> qua, qui, sex = 3
    assert dias_uteis(date(2026, 2, 13), date(2026, 2, 20), feriados) == 3
    # Semana normal: (seg, seg] = 5
    assert dias_uteis(date(2026, 3, 2), date(2026, 3, 9), feriados) == 5
