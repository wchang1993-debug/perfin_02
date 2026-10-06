"""Aplica no Supabase as migrations de supabase/migrations/ ainda não aplicadas.

Uso (na raiz do repositório):
    python Aplicativo/supabase/aplicar_migrations.py

Lê DATABASE_URL do ambiente ou do arquivo .env da raiz. Cada migration roda em uma
transação e é registrada em controle.migracoes (schema fora da API REST do Supabase).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg

RAIZ = Path(__file__).resolve().parents[2]
PASTA_MIGRATIONS = Path(__file__).resolve().parent / "migrations"


def ler_database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    arquivo_env = RAIZ / ".env"
    if arquivo_env.exists():
        for linha in arquivo_env.read_text(encoding="utf-8").splitlines():
            if linha.startswith("DATABASE_URL="):
                return linha.split("=", 1)[1].strip().strip('"')
    raise SystemExit("DATABASE_URL não definida (ambiente ou .env).")


def main() -> int:
    arquivos = sorted(PASTA_MIGRATIONS.glob("*.sql"))
    with psycopg.connect(ler_database_url(), autocommit=True) as conexao:
        with conexao.cursor() as cursor:
            cursor.execute(
                "create schema if not exists controle;"
                "create table if not exists controle.migracoes ("
                " nome text primary key, aplicada_em timestamptz not null default now());"
            )
            cursor.execute("select nome from controle.migracoes")
            aplicadas = {linha[0] for linha in cursor.fetchall()}

        for arquivo in arquivos:
            if arquivo.name in aplicadas:
                print(f"= {arquivo.name} (já aplicada)")
                continue
            with conexao.transaction(), conexao.cursor() as cursor:
                cursor.execute(arquivo.read_text(encoding="utf-8"))
                cursor.execute("insert into controle.migracoes (nome) values (%s)", (arquivo.name,))
            print(f"+ {arquivo.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
