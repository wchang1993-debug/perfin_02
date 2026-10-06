"""Coletores ANBIMA com amostras fictícias no layout real de cada arquivo."""

from datetime import date
from decimal import Decimal

import pytest

from coletores.comum.calendario import dias_uteis_recentes
from coletores.comum.numeros import ErroFormato
from coletores.fontes import anbima_curvas, anbima_debentures, anbima_indices, anbima_titulos

TITULOS = (
    "ANBIMA - Associação Brasileira das Entidades dos Mercados Financeiro e de Capitais\n\n"
    "Titulo@Data Referencia@Codigo SELIC@Data Base/Emissao@Data Vencimento@Tx. Compra@Tx. Venda@Tx. Indicativas@PU@"
    "Desvio padrao@Interv. Ind. Inf. (D0)@Interv. Ind. Sup. (D0)@Interv. Ind. Inf. (D+1)@Interv. Ind. Sup. (D+1)@Criterio\n"
    "LTN@20300102@100000@20280101@20310101@11,1@11,0@11,05@900,5@0,01@10,9@11,2@10,8@11,3@Calculado\n"
    "NTN-B@20300102@760199@20200101@20350515@6,9@6,8@6,85@4.500,25@0,02@6,7@7,0@6,6@7,1@Calculado\n"
    "LFT@20300102@210100@20250101@20320301@--@--@--@--@--@--@--@--@--@Calculado\n"
)

CURVAS = (
    "02/01/2030;Beta 1;Beta 2;Beta 3;Beta 4;Lambda 1;Lambda 2\n"
    "PREFIXADOS;0,12;0,01;-0,02;0,01;1,2;0,4\n"
    "IPCA;0,06;-0,03;0,05;0,02;1,7;0,3\n\n"
    "ETTJ Inflação Implicita (IPCA)\n"
    "Vertices;ETTJ IPCA;ETTJ PREF;Inflação Implícita\n"
    "252;6,1000;11,5000;5,0900\n"
    "2.646;6,9000;;\n\n"
    "PREFIXADOS (CIRCULAR 3.361)\nVertices;Taxa (%a.a.)\n21;11,9\n"
)

IMA = (
    "0@ANBIMA\n1@TOTAIS\n"
    "1@Data de Referência@INDICE@Número Índice@Variação Diária(%)@Variação Mensal(%)@Variação Anual(%)@"
    "Variação Últimos 12 Meses(%)@Variação Últimos 24 Meses(%)@Duration(d.u.)@Peso(Geral)(%)@"
    "Carteira a Mercado(R$ mil)@Número de Operações *@Quant. Negociada(1.000 títulos) *@Valor Negociado(R$ mil) *@"
    "PMR@Convexidade@Yield@Redemption Yield\n"
    "1@02/01/2030@IMA-B@10000,50@0,10@1,20@1,20@9,50@20,00@1768,4@30,00@100@--@--@--@1,0@2,0@6,9@6,8\n"
    "2@COMPOSIÇÃO DE CARTEIRA\n2@02/01/2030@IMA-B@NTN-B@15/05/2035@760199\n"
)

DEBENTURES = (
    "ANBIMA - Associação Brasileira das Entidades dos Mercados Financeiro e de Capitais\n\n"
    "Código@Nome@Repac./  Venc.@Índice/ Correção@Taxa de Compra@Taxa de Venda@Taxa Indicativa@Desvio Padrão@"
    "Intervalo Indicativo Minimo@Intervalo Indicativo Máximo@PU@% PU Par / % VNE@Duration@% Reune@Referência NTN-B\n"
    "FICT11@EMPRESA FICTICIA S.A. (*) (**)@15/05/2035@IPCA + 6,5%@7,1@6,9@7,0@0,05@6,9@7,1@1.050,10@99,5@1500,4@@15/05/2035\n"
    "FICT12@OUTRA FICTICIA S.A. (*)@10/10/2032@DI + 1,2%@1,3@1,1@1,2@0,02@1,1@1,3@1010,00@100,1@600,6@20@\n"
    "FICT13@SEM TAXA S.A.@01/01/2040@100% do DI@--@--@--@--@--@--@N/D@N/D@N/D@@\n"
)


def test_titulos_le_layout_e_ignora_linha_sem_taxa():
    linhas = list(anbima_titulos.interpretar(TITULOS))
    assert [l["tipo"] for l in linhas] == ["LTN", "NTN-B"]
    assert linhas[1]["pu"] == Decimal("4500.25")
    assert linhas[1]["vencimento"] == date(2035, 5, 15)
    assert linhas[0]["data"] == date(2030, 1, 2)


def test_titulos_tipo_desconhecido_falha():
    with pytest.raises(ErroFormato):
        list(anbima_titulos.interpretar(TITULOS.replace("LTN@2030", "XYZ@2030")))


def test_titulos_cabecalho_alterado_falha():
    with pytest.raises(ErroFormato):
        list(anbima_titulos.interpretar(TITULOS.replace("Tx. Compra", "Taxa Compra")))


def test_curvas_parametros_e_vertices():
    parametros, vertices = anbima_curvas.interpretar(CURVAS)
    assert {p["curva"] for p in parametros} == {"pre", "real"}
    assert parametros[0]["beta1"] == Decimal("0.12")
    por_curva = {(v["curva"], v["du"]): v["taxa"] for v in vertices}
    assert por_curva[("pre", 252)] == Decimal("11.5000")
    assert por_curva[("implicita", 252)] == Decimal("5.0900")
    # Vértices longos só têm curva real; milhar com ponto ("2.646").
    assert por_curva[("real", 2646)] == Decimal("6.9000")
    assert ("pre", 2646) not in por_curva


def test_curvas_sem_secao_de_vertices_falha():
    with pytest.raises(ErroFormato):
        anbima_curvas.interpretar(CURVAS.split("ETTJ Inflação")[0])


def test_ima_usa_so_os_totais():
    linhas = list(anbima_indices.interpretar(IMA))
    assert len(linhas) == 1
    assert linhas[0]["indice"] == "IMA-B"
    assert linhas[0]["duration_du"] == 1768
    assert linhas[0]["variacao_12m"] == Decimal("9.50")


def test_debentures_indexador_emissor_e_sem_taxa():
    linhas = list(anbima_debentures.interpretar(DEBENTURES, date(2030, 1, 2)))
    assert [l["codigo"] for l in linhas] == ["FICT11", "FICT12"]
    assert linhas[0]["emissor"] == "EMPRESA FICTICIA S.A."
    assert linhas[0]["indexador"] == "IPCA+"
    assert linhas[0]["referencia_ntnb"] == date(2035, 5, 15)
    assert linhas[0]["duration_du"] == 1500
    assert linhas[1]["indexador"] == "DI+"
    assert linhas[1]["referencia_ntnb"] is None


@pytest.mark.parametrize(
    "texto, grupo",
    [("IPCA + 6,5%", "IPCA+"), ("DI + 1,2%", "DI+"), ("105% do DI", "%DI"), ("PREFIXADO 12%", "PRE"), ("IGP-M", "IGP-M"), ("TR", "OUTRO")],
)
def test_indexador(texto, grupo):
    assert anbima_debentures.indexador(texto) == grupo


def test_dias_uteis_recentes_respeita_ultima_data_e_maximo():
    # 06/10/2026 é terça; a última coleta foi na quinta 01/10 → faltam sex 02, seg 05 e ter 06.
    assert dias_uteis_recentes(date(2026, 10, 6), date(2026, 10, 1), 5) == [date(2026, 10, 2), date(2026, 10, 5), date(2026, 10, 6)]
    assert dias_uteis_recentes(date(2026, 10, 6), None, 2) == [date(2026, 10, 5), date(2026, 10, 6)]
    # Feriado de 12/10/2026 (segunda) é pulado.
    assert dias_uteis_recentes(date(2026, 10, 13), date(2026, 10, 9), 5) == [date(2026, 10, 13)]
