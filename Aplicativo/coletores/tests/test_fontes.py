import io
from datetime import date
from decimal import Decimal

import pytest

from coletores.comum.execucao import executar_coleta
from coletores.comum.numeros import ErroFormato
from coletores.fontes import bcb, tesouro_direto
from coletores.fontes.feriados import linhas_feriados

# Amostras fictícias no formato real de cada fonte.
CSV_TESOURO = (
    "Tipo Titulo;Data Vencimento;Data Base;Taxa Compra Manha;Taxa Venda Manha;"
    "PU Compra Manha;PU Venda Manha;PU Base Manha\n"
    "Tesouro Selic;01/03/2028;05/10/2026;0,03;0,04;20018,48;20005,43;20005,43\n"
    "Tesouro IPCA+;15/05/2035;02/10/2026;7,10;7,22;2.345,67;2.300,11;2.300,11\n"
)


class ClienteFalso:
    """Substitui o Supabase: guarda o que seria gravado."""

    def __init__(self, ultima=None, catalogo=None):
        self._ultima = ultima
        self._catalogo = catalogo or []
        self.gravado: dict[str, list] = {}
        self.atualizacoes: list[dict] = []

    def ultima_data(self, tabela, filtros=None):
        return self._ultima

    def selecionar(self, tabela, parametros):
        return self._catalogo

    def upsert(self, tabela, linhas, conflito):
        lista = list(linhas)
        self.gravado.setdefault(tabela, []).extend(lista)
        return len(lista)

    def inserir(self, tabela, linha):
        return {"id": 1, **linha}

    def atualizar(self, tabela, filtros, valores):
        self.atualizacoes.append(valores)


class SessaoFalsa:
    def __init__(self, json=None, status=200, conteudo=b""):
        self._json, self._status, self._conteudo = json, status, conteudo
        self.chamadas: list[dict] = []

    def get(self, url, params=None, timeout=None):
        self.chamadas.append({"url": url, "params": params})
        sessao = self

        class Resposta:
            status_code = sessao._status
            content = sessao._conteudo

            def raise_for_status(self):
                if self.status_code >= 400:
                    raise RuntimeError(f"HTTP {self.status_code}")

            def json(self):
                return sessao._json

        return Resposta()


def test_bcb_interpreta_resposta_sgs():
    linhas = bcb.interpretar_resposta([{"data": "01/08/2026", "valor": "-0.32"}], "IPCA")
    assert linhas == [{"indicador_codigo": "IPCA", "data": date(2026, 8, 1), "valor": Decimal("-0.32")}]


def test_bcb_resposta_fora_do_formato_falha():
    with pytest.raises(ErroFormato):
        bcb.interpretar_resposta({"erro": "x"}, "IPCA")
    with pytest.raises(ErroFormato):
        bcb.interpretar_resposta([{"data": "01/08/2026"}], "IPCA")


def test_bcb_janelas_cobrem_o_periodo_sem_sobreposicao():
    janelas = list(bcb.janelas(date(2016, 1, 1), date(2026, 10, 6)))
    assert janelas[0][0] == date(2016, 1, 1) and janelas[-1][1] == date(2026, 10, 6)
    for (_, fim), (inicio, _) in zip(janelas, janelas[1:]):
        assert (inicio - fim).days == 1


def test_bcb_carga_incremental_reprocessa_dias_de_revisao():
    cliente = ClienteFalso(ultima=date(2026, 10, 1), catalogo=[{"codigo": "USD", "serie_sgs": 1}])
    sessao = SessaoFalsa(json=[{"data": "02/10/2026", "valor": "5.3412"}])
    assert bcb.coletar(cliente, date(2026, 10, 6), sessao) == 1
    assert sessao.chamadas[0]["params"]["dataInicial"] == "21/09/2026"


def test_bcb_404_significa_sem_dados():
    cliente = ClienteFalso(catalogo=[{"codigo": "IPCA", "serie_sgs": 433}])
    assert bcb.coletar(cliente, date(2026, 10, 6), SessaoFalsa(status=404)) == 0


def test_bcb_catalogo_vazio_falha():
    with pytest.raises(ErroFormato):
        bcb.coletar(ClienteFalso(), date(2026, 10, 6), SessaoFalsa(json=[]))


def test_tesouro_le_csv_e_filtra_datas_ja_gravadas():
    linhas = list(tesouro_direto.interpretar_csv(io.StringIO(CSV_TESOURO), a_partir_de=date(2026, 10, 2)))
    assert len(linhas) == 1
    assert linhas[0]["titulo"] == "Tesouro Selic"
    assert linhas[0]["pu_compra"] == Decimal("20018.48")


def test_tesouro_converte_milhar_com_ponto():
    linhas = list(tesouro_direto.interpretar_csv(io.StringIO(CSV_TESOURO), a_partir_de=None))
    assert linhas[1]["pu_compra"] == Decimal("2345.67")
    assert linhas[1]["vencimento"] == date(2035, 5, 15)


def test_tesouro_cabecalho_alterado_falha():
    with pytest.raises(ErroFormato):
        list(tesouro_direto.interpretar_csv(io.StringIO("Titulo;Data\nx;y\n"), None))


def test_feriados_tem_datas_unicas():
    linhas = linhas_feriados(2024, 2026)
    datas = [linha["data"] for linha in linhas]
    assert len(datas) == len(set(datas))


def test_execucao_registra_erro_sem_interromper():
    cliente = ClienteFalso()

    def falha():
        raise ErroFormato("layout mudou")

    assert executar_coleta(cliente, "fonte_x", falha) is False
    assert cliente.atualizacoes[-1]["status"] == "erro"
    assert "layout mudou" in cliente.atualizacoes[-1]["erro"]


def test_execucao_registra_sucesso_com_total():
    cliente = ClienteFalso()
    assert executar_coleta(cliente, "fonte_x", lambda: 42) is True
    assert cliente.atualizacoes[-1] == {**cliente.atualizacoes[-1], "status": "sucesso", "registros": 42}
