"""Hook PreToolUse (Edit/Write/MultiEdit): impede gravar arquivos sensíveis ou conteúdo com credenciais."""
import json
import re
import sys

sys.stderr.reconfigure(encoding="utf-8")

# Modelos de configuração com valores fictícios podem ser versionados.
ARQUIVOS_PERMITIDOS = {".env.example", ".env.sample", ".env.template"}

ARQUIVOS_SENSIVEIS = [
    re.compile(r"^\.env(\..+)?$"),
    re.compile(r"\.(pem|key|p12|pfx|jks|keystore)$", re.IGNORECASE),
    re.compile(r"^(id_rsa|id_ecdsa|id_ed25519)$"),
    re.compile(r"^(credentials|secrets)\.(json|ya?ml)$", re.IGNORECASE),
]

CREDENCIAIS = {
    "chave privada": re.compile(r"-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----"),
    "chave de acesso AWS": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "token do GitHub": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
    "token do Slack": re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}"),
    "chave de API (sk-...)": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}"),
    "chave do Stripe": re.compile(r"\b[rs]k_live_[A-Za-z0-9]{20,}"),
    "chave de API do Google": re.compile(r"\bAIza[0-9A-Za-z_-]{35}\b"),
}


def bloquear(motivo):
    print(f"Bloqueado pelo hook proteger-segredos: {motivo}", file=sys.stderr)
    sys.exit(2)


dados = json.loads(sys.stdin.buffer.read())
entrada = dados.get("tool_input", {})

caminho = entrada.get("file_path", "")
nome = re.split(r"[\\/]", caminho)[-1]
if nome not in ARQUIVOS_PERMITIDOS and any(p.search(nome) for p in ARQUIVOS_SENSIVEIS):
    bloquear(
        f"'{nome}' é um arquivo sensível (credenciais/chaves). "
        "Peça ao usuário para editá-lo manualmente ou use um modelo como .env.example com valores fictícios."
    )

textos = [entrada.get("content", ""), entrada.get("new_string", "")]
textos += [edicao.get("new_string", "") for edicao in entrada.get("edits", [])]
conteudo = "\n".join(t for t in textos if t)
for tipo, padrao in CREDENCIAIS.items():
    if padrao.search(conteudo):
        bloquear(
            f"o conteúdo parece conter uma {tipo}. "
            "Use variável de ambiente ou um valor fictício em vez da credencial."
        )
