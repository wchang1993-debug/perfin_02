"""Ponto de entrada dos coletores do Portal Perfin.

Uso (na pasta Aplicativo/):
    python -m coletores.main macro      # BCB e Tesouro Direto (manhã)
    python -m coletores.main mercado    # ANBIMA e B3 (noite) — exige COLETA_ANBIMA_B3_ATIVA=true
    python -m coletores.main feriados   # calendário de dias úteis

Variáveis de ambiente: SUPABASE_URL, SUPABASE_SECRET_KEY, COLETA_ANBIMA_B3_ATIVA.
"""

from __future__ import annotations

import argparse
import os
import sys
from datetime import date, datetime
from typing import Callable
from zoneinfo import ZoneInfo

from .comum.execucao import executar_coleta
from .comum.supabase import ClienteSupabase
from .fontes import bcb, feriados, tesouro_direto

Coletor = Callable[[ClienteSupabase, date], int]

GRUPOS: dict[str, dict[str, Coletor]] = {
    "macro": {"bcb": bcb.coletar, "tesouro_direto": tesouro_direto.coletar},
    # Coletores ANBIMA e B3 entram aqui (ondas 2 e 3), atrás da chave de licença.
    "mercado": {},
    "feriados": {"feriados": feriados.coletar},
}


def variavel_obrigatoria(nome: str) -> str:
    valor = os.environ.get(nome, "").strip()
    if not valor:
        raise SystemExit(f"Variável de ambiente obrigatória ausente: {nome}")
    return valor


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Coletores do Portal Perfin")
    parser.add_argument("grupo", choices=sorted(GRUPOS))
    args = parser.parse_args(argv)

    if args.grupo == "mercado" and os.environ.get("COLETA_ANBIMA_B3_ATIVA", "").lower() != "true":
        print("Coleta ANBIMA/B3 desativada (COLETA_ANBIMA_B3_ATIVA != true); aguardando validação de licença.")
        return 0

    cliente = ClienteSupabase(variavel_obrigatoria("SUPABASE_URL"), variavel_obrigatoria("SUPABASE_SECRET_KEY"))
    hoje = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
    resultados = [
        executar_coleta(cliente, fonte, lambda coletor=coletor: coletor(cliente, hoje))
        for fonte, coletor in GRUPOS[args.grupo].items()
    ]
    # Uma fonte com erro não interrompe as demais, mas a execução termina com falha
    # para o GitHub Actions avisar por e-mail.
    return 0 if all(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
