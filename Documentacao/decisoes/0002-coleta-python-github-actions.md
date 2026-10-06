# 0002 — Coleta de dados em Python no GitHub Actions

- **Data:** 06/10/2026
- **Status:** aceita

## Contexto
Os indicadores (BCB, Tesouro Direto e, futuramente, ANBIMA e B3) precisam ser atualizados diariamente. O app roda
na Vercel, que não executa Python agendado de forma simples.

## Decisão
- Coletores em Python (`Aplicativo/coletores/`), um módulo por fonte, gravando por upsert (idempotente) no
  PostgREST do Supabase com a secret key e registrando cada execução em `execucoes_coleta`.
- Workflow `.github/workflows/coleta.yml`: 09:00 BRT (macro: BCB e Tesouro) e 21:30 BRT em dias úteis (mercado:
  ANBIMA e B3), mais execução manual. Os testes rodam antes da coleta.
- Valores em `Decimal`; parsers validam o layout e **falham explicitamente** se a fonte mudar.
- Coleta ANBIMA/B3 atrás da variável `COLETA_ANBIMA_B3_ATIVA` até a validação dos termos de uso.

## Alternativas consideradas
- **Vercel Cron com coletor em TypeScript**: descartada por pedido do time (script em Python) e pelo limite de tempo das funções.
- **Execução manual**: sem garantia de atualização diária.

## Consequências
- Falhas do workflow chegam por e-mail do GitHub; o Portal mostra alerta de dados desatualizados.
- O plano Free do Supabase (500 MB) comporta cerca de 2 anos de debêntures; depois será preciso plano Pro ou retenção.
