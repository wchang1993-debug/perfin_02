---
paths:
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/__tests__/**"
  - "**/tests/**"
  - "**/e2e/**"
---

# Testes

- Siga o framework e a organização de testes já usados no projeto.
- Cada teste verifica um comportamento e tem nome que descreve esse comportamento.
- Testes determinísticos e independentes: sem dependência de ordem de execução, relógio real, rede real ou serviços externos — use mocks ou fakes.
- Use apenas dados fictícios.
- Não apague nem desative um teste que está falhando para fazer a suíte passar; corrija a causa ou reporte.
