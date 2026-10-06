"""Hook PostToolUse (Edit/Write/MultiEdit): formata o arquivo com o Prettier instalado no projeto.

Não faz nada enquanto o projeto não tiver Node.js e o Prettier em node_modules.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.stderr.reconfigure(encoding="utf-8")

EXTENSOES = {
    ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts",
    ".json", ".css", ".scss", ".less", ".html", ".md", ".mdx", ".yml", ".yaml",
}


def localizar_prettier(arquivo, raiz):
    """Procura node_modules/prettier subindo da pasta do arquivo até a raiz do projeto."""
    for pasta in arquivo.parents:
        pacote = pasta / "node_modules" / "prettier" / "package.json"
        if pacote.is_file():
            binario = json.loads(pacote.read_text(encoding="utf-8")).get("bin")
            if isinstance(binario, dict):
                binario = binario.get("prettier")
            return pacote.parent / binario if binario else None
        if pasta == raiz:
            return None
    return None


dados = json.loads(sys.stdin.buffer.read())
caminho = dados.get("tool_input", {}).get("file_path")
raiz = Path(os.environ.get("CLAUDE_PROJECT_DIR") or dados.get("cwd") or ".").resolve()
node = shutil.which("node")
if not caminho or not node:
    sys.exit(0)

arquivo = Path(caminho).resolve()
if arquivo.suffix.lower() not in EXTENSOES or raiz not in arquivo.parents or not arquivo.is_file():
    sys.exit(0)

prettier = localizar_prettier(arquivo, raiz)
if not prettier:
    sys.exit(0)

resultado = subprocess.run(
    [node, str(prettier), "--write", "--ignore-unknown", str(arquivo)],
    capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60,
)
if resultado.returncode != 0:
    print(f"Prettier falhou em {arquivo.name}: {resultado.stderr.strip()}", file=sys.stderr)
    sys.exit(1)
