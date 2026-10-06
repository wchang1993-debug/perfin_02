---
name: documentar
description: Processo para criar ou atualizar a documentação em Documentacao/ e registrar decisões de arquitetura (ADR). Use ao concluir uma funcionalidade, mudar comportamento visível ou tomar uma decisão técnica relevante.
---

# Documentar

## Onde
- `Documentacao/README.md` — índice da documentação.
- `Documentacao/aplicativo/` — documentação do aplicativo.
- `Documentacao/website/` — documentação do site institucional.
- `Documentacao/decisoes/` — decisões de arquitetura (ADRs), um arquivo por decisão, no formato `NNNN-titulo-curto.md` (numeração sequencial com 4 dígitos).

Crie as pastas e o índice na primeira vez que forem necessários e mantenha o índice atualizado.

## Regras
- Markdown, em português (pt-BR).
- Documente o que existe; não descreva funcionalidades planejadas como se estivessem prontas.
- Nada de credenciais ou dados reais de clientes; use exemplos fictícios.
- Atualize a documentação existente em vez de criar documentos paralelos sobre o mesmo assunto.

## Modelo de ADR

```markdown
# NNNN — Título da decisão

- **Data:** DD/MM/AAAA
- **Status:** proposta | aceita | substituída por NNNN

## Contexto
Qual problema ou necessidade motivou a decisão.

## Decisão
O que foi decidido.

## Alternativas consideradas
Opções avaliadas e por que foram descartadas.

## Consequências
Impactos positivos e negativos, e o que muda a partir de agora.
```
