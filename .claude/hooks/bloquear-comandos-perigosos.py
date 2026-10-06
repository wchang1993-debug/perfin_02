"""Hook PreToolUse (Bash/PowerShell): bloqueia comandos destrutivos ou irreversíveis."""
import json
import re
import sys

sys.stderr.reconfigure(encoding="utf-8")

COMANDOS_DE_REMOCAO = {"rm", "remove-item", "ri", "del", "erase", "rd", "rmdir"}

# Raiz, home, unidade inteira, diretório atual/pai ou curinga total.
ALVO_PERIGOSO = re.compile(
    r"""^(
        /\*? | /[a-z]/?\*?
      | ~[\\/]?\*?
      | \*
      | \.{1,2}[\\/]?\*?
      | \$home[\\/]?\*? | \$\{home\}[\\/]?\*? | \$env:userprofile[\\/]?\*?
      | [a-z]:[\\/]?\*?
      | \\
    )$""",
    re.IGNORECASE | re.VERBOSE,
)

SQL_DESTRUTIVO = re.compile(r"\b(drop\s+(database|schema|table)|truncate\s+table)\b", re.IGNORECASE)


def motivo_de_bloqueio(segmento):
    tokens = [t.strip("'\"") for t in segmento.split()]
    while tokens and (tokens[0] == "sudo" or re.match(r"^\w+=", tokens[0])):
        tokens.pop(0)
    if not tokens:
        return None
    comando, argumentos = tokens[0].lower(), tokens[1:]

    if comando in COMANDOS_DE_REMOCAO and any(ALVO_PERIGOSO.match(a) for a in argumentos):
        return "remoção da raiz, da pasta do usuário, do diretório atual ou de tudo (*)"

    if comando == "git" and argumentos:
        if "push" in argumentos and any(
            a == "--force" or re.match(r"^-[a-z]*f[a-z]*$", a) for a in argumentos
        ):
            return "git push --force reescreve o histórico remoto (use --force-with-lease, se necessário)"
        if "reset" in argumentos and "--hard" in argumentos:
            return "git reset --hard descarta alterações locais"
        if "clean" in argumentos and any(
            a == "--force" or re.match(r"^-[a-z]*f[a-z]*$", a) for a in argumentos
        ):
            return "git clean -f apaga arquivos não versionados"

    if SQL_DESTRUTIVO.search(segmento):
        return "DROP/TRUNCATE apaga dados de forma irreversível"
    return None


dados = json.loads(sys.stdin.buffer.read())
comando = dados.get("tool_input", {}).get("command", "")

for segmento in re.split(r"&&|\|\||[;|\n]", comando):
    motivo = motivo_de_bloqueio(segmento)
    if motivo:
        print(
            f"Bloqueado pelo hook bloquear-comandos-perigosos: {motivo}. "
            "Se for realmente necessário, peça ao usuário para executar o comando manualmente.",
            file=sys.stderr,
        )
        sys.exit(2)
