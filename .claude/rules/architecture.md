# Arquitetura

- Preserve a arquitetura existente; entenda a estrutura atual antes de propor qualquer alteração.
- Prefira modificar ou aprimorar um módulo existente antes de criar um novo.
- Não introduza novas dependências sem explicar os motivos (o que resolvem, por que o código existente não basta e se a biblioteca é mantida).
- Regras e lógica de negócio nunca ficam no código React/Next.js de interface; elas vivem em módulos de domínio/serviço (ex.: `lib/`, `services/`, `server/`) e a interface apenas as consome.
- Evite arquivos com mais de 400 linhas; se necessário, divida-os em módulos menores e coesos.
- Reutilize funções, utilitários e ferramentas já existentes sempre que possível.
- Evite funções com mais de 50 linhas; extraia partes em funções menores com nomes claros.
