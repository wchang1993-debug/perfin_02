"""Registro de cada execução de coleta em public.execucoes_coleta."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Callable

from .supabase import ClienteSupabase

# Mensagens de erro vão para o banco: limitamos o tamanho e nunca incluímos credenciais
# (as exceções dos coletores só carregam URL pública da fonte e detalhes de formato).
LIMITE_MENSAGEM_ERRO = 1000


def executar_coleta(cliente: ClienteSupabase, fonte: str, coletar: Callable[[], int]) -> bool:
    """Roda `coletar`, registra o resultado e devolve True em caso de sucesso."""
    registro = cliente.inserir("execucoes_coleta", {"fonte": fonte, "status": "executando"})
    filtro = {"id": f"eq.{registro['id']}"}
    try:
        total = coletar()
    except Exception as erro:  # registra e propaga o status; o main decide o código de saída
        cliente.atualizar("execucoes_coleta", filtro, {
            "status": "erro",
            "finalizado_em": datetime.now(timezone.utc).isoformat(),
            "erro": f"{type(erro).__name__}: {erro}"[:LIMITE_MENSAGEM_ERRO],
        })
        print(f"[{fonte}] ERRO: {type(erro).__name__}: {erro}")
        return False
    cliente.atualizar("execucoes_coleta", filtro, {
        "status": "sucesso",
        "finalizado_em": datetime.now(timezone.utc).isoformat(),
        "registros": total,
    })
    print(f"[{fonte}] {total} registros gravados")
    return True
