---
name: corrigir-bug
description: Processo padrão para investigar e corrigir um bug com teste de regressão. Use quando o usuário relatar um erro, falha ou comportamento incorreto.
---

# Corrigir bug

1. **Reproduzir** — entenda o comportamento esperado e o observado e encontre os passos mínimos para reproduzir. Se não conseguir, peça mais informações em vez de supor a causa.
2. **Localizar a causa raiz** — rastreie até a origem do problema; não corrija apenas o sintoma.
3. **Escrever o teste primeiro** — crie um teste que falha por causa do bug (use o agente `tester` se o caso for complexo).
4. **Corrigir** — faça a menor mudança que resolve a causa raiz e procure o mesmo erro em outros pontos do código.
5. **Validar** — rode o teste novo e a suíte relacionada: o teste novo deve passar e nada mais deve quebrar.
6. **Revisar** — acione o agente `reviewer` sobre a correção.
7. **Concluir** — informe ao usuário a causa, a correção e como foi validada.
