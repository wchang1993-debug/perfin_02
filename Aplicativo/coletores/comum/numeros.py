"""Conversão de textos das fontes (padrão brasileiro) para Decimal e date."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal, InvalidOperation


class ErroFormato(ValueError):
    """O dado da fonte não está no formato esperado; a coleta deve falhar sem gravar."""


def decimal_br(texto: str) -> Decimal | None:
    """'1.234,56' -> Decimal('1234.56'); vazio ou '-' -> None."""
    limpo = texto.strip()
    if limpo in ("", "-", "--", "N/D"):
        return None
    if "," in limpo:
        limpo = limpo.replace(".", "").replace(",", ".")
    try:
        return Decimal(limpo)
    except InvalidOperation as erro:
        raise ErroFormato(f"Número inválido: {texto!r}") from erro


def data_br(texto: str) -> date:
    """'05/10/2026' -> date(2026, 10, 5)."""
    try:
        return datetime.strptime(texto.strip(), "%d/%m/%Y").date()
    except ValueError as erro:
        raise ErroFormato(f"Data inválida: {texto!r}") from erro


def data_compacta(texto: str) -> date:
    """'20261005' -> date(2026, 10, 5)."""
    try:
        return datetime.strptime(texto.strip(), "%Y%m%d").date()
    except ValueError as erro:
        raise ErroFormato(f"Data inválida: {texto!r}") from erro


def validar_cabecalho(recebido: list[str], esperado: list[str], fonte: str) -> None:
    """Falha explicitamente se a fonte mudar o layout (evita gravar colunas trocadas)."""
    normalizado = [coluna.strip() for coluna in recebido]
    if normalizado != esperado:
        raise ErroFormato(f"{fonte}: cabeçalho inesperado {normalizado}; esperado {esperado}")
