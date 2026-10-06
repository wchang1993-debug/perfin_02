# Perfin_02 — Perfin Wealth Management

Repositório da Perfin Wealth Management (PWM). Reúne o aplicativo, o site institucional e a documentação do projeto.

## Estrutura

| Pasta            | Conteúdo                                           |
| ---------------- | -------------------------------------------------- |
| `Aplicativo/`    | Aplicativo da PWM                                  |
| `Website/`       | Site institucional                                 |
| `Documentacao/`  | Documentação técnica e de negócio (Markdown)       |
| `.claude/`       | Configuração do Claude Code (agentes, skills, regras e hooks) |

## Primeiros passos

1. Clone o repositório:
   ```bash
   git clone https://github.com/wchang1993-debug/perfin_02.git
   ```
2. Crie o arquivo de variáveis de ambiente a partir do modelo e preencha os valores reais:
   ```bash
   cp .env.example .env
   ```
3. Aplicativo (Portal Perfin — Next.js + TypeScript, PWA), na pasta `Aplicativo/`:
   ```bash
   npm install
   ```
   ```bash
   npm test
   ```
   O Portal roda somente pela URL da Vercel; veja [Documentacao/aplicativo/configuracao.md](Documentacao/aplicativo/configuracao.md).
4. Coletores de dados (Python), na pasta `Aplicativo/`:
   ```bash
   pip install -r coletores/requirements-dev.txt
   ```
   ```bash
   python -m pytest coletores
   ```

## Serviços

- **Supabase** (projeto `perfin_02`): banco PostgreSQL (tabelas com RLS e funções de cálculo) e autenticação (Google).
- **Vercel**: hospedagem do Portal Perfin.
- **GitHub Actions**: coleta diária de indicadores (BCB e Tesouro Direto; ANBIMA e B3 após validação de licença).
- **Google Cloud**: OAuth, Agenda, Drive, Planilhas e Gmail (somente rascunhos).
- **Gemini**: assistente de análise.

Documentação completa em [Documentacao/README.md](Documentacao/README.md).

## Claude Code

A pasta `.claude/` é versionada e define como o Claude Code trabalha no projeto: agentes (`architect`, `frontend`, `tester`, `reviewer`), skills de processo (`implementar-feature`, `corrigir-bug`, `documentar`), regras permanentes e hooks de segurança. Veja `.claude/CLAUDE.md`.

## Convenções

- Idioma padrão: português (pt-BR).
- Credenciais ficam apenas no `.env` (nunca versionado).
- Decisões de arquitetura são registradas em `Documentacao/decisoes/`.
