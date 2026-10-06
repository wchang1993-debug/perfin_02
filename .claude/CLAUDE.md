# Perfin_02 — Perfin Wealth Management

Repositório da Perfin Wealth Management (PWM). Idioma padrão: **português (pt-BR)** em código-fonte comentado, documentação e textos de interface.

## Estrutura
- `Aplicativo/` — aplicativo
- `Website/` — site institucional.
- `Documentacao/` — documentação técnica e de negócio (Markdown).


## Convenções
- Nunca versionar credenciais, chaves de API ou dados reais de clientes; use dados fictícios em testes.
- Decisões de arquitetura relevantes ficam registradas em `Documentacao/decisoes/`.

## Configuração do Claude Code (`.claude/`)
- `agents/` — subagentes: `architect` (planeja, somente leitura), `frontend` (React/Next.js), `tester` (cria testes), `reviewer` (code review, somente leitura).
- `skills/` — processos: `implementar-feature`, `corrigir-bug`, `documentar`.
- `rules/` — regras permanentes (segurança, qualidade de código, testes), carregadas automaticamente.
- `hooks/` + `settings.json` — hooks em Python: bloqueiam gravação de credenciais e comandos destrutivos e formatam arquivos com o Prettier (quando instalado no projeto).

