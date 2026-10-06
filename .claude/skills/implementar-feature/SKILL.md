---
name: implementar-feature
description: Processo padrão para implementar uma funcionalidade ou mudança não trivial, do planejamento à revisão, usando os agentes architect, frontend, tester e reviewer. Use quando o pedido for criar ou alterar uma funcionalidade.
---

# Implementar funcionalidade

1. **Planejar** — acione o agente `architect` com o requisito e revise o plano entregue (impacto, arquivos, riscos, passos). Se houver dúvidas de negócio ou decisões em aberto, confirme com o usuário antes de seguir.
2. **Implementar** — execute o plano passo a passo. Para interfaces (React/Next.js), use o agente `frontend`. Mantenha as mudanças restritas ao que o plano prevê.
3. **Testar** — acione o agente `tester` com a lista de arquivos alterados e o comportamento esperado. Corrija os bugs reportados e rode os testes novamente.
4. **Revisar** — acione o agente `reviewer`. Corrija os achados críticos e altos; para os demais, corrija ou justifique por que ficaram.
5. **Documentar** — se houve decisão de arquitetura relevante ou mudança de comportamento visível, siga a skill `documentar`.
6. **Concluir** — resuma para o usuário o que mudou, como foi validado e o que ficou pendente.

Para mudanças triviais (texto, ajuste pontual), pule o passo 1.
