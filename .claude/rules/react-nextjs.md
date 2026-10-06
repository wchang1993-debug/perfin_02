# React / Next.js

## Estrutura e componentes
- Use o App Router (`app/`) e TypeScript; evite `any`.
- Componentes são funções pequenas, com uma única responsabilidade; um componente por arquivo, nomeado em PascalCase.
- Componentes só exibem dados e capturam interações; cálculos, validações de negócio e acesso a dados ficam fora deles (ver `architecture.md`).
- Lógica de estado reutilizável vai para hooks customizados (`useAlgo`), não é copiada entre componentes.
- Reaproveite componentes de interface existentes antes de criar novos.

## Server x Client
- Componentes são Server Components por padrão; use `"use client"` apenas quando precisar de estado, efeitos ou eventos do navegador, e o mais abaixo possível na árvore.
- Busque dados no servidor (Server Components, Server Actions ou Route Handlers), não em `useEffect`.
- Código que usa segredos ou acessa o banco (ex.: `DATABASE_URL`) roda somente no servidor; marque esses módulos com `import "server-only"`.
- Apenas variáveis `NEXT_PUBLIC_*` podem chegar ao navegador — nunca coloque segredos nelas.
- Toda Server Action e Route Handler valida a entrada (ex.: com Zod) e verifica autenticação/autorização.

## Estado e efeitos
- Mantenha o estado o mais local possível; não duplique em estado o que pode ser calculado a partir de props ou de outro estado.
- Use `useEffect` apenas para sincronizar com sistemas externos; sempre declare as dependências corretamente.
- Listas renderizadas usam `key` estável e única (nunca o índice quando a lista pode mudar).

## Interface e acessibilidade
- Trate os estados de carregamento, erro e vazio (`loading.tsx`, `error.tsx`, mensagens amigáveis).
- Use HTML semântico (`button`, `label`, `nav`…), textos alternativos em imagens e navegação por teclado.
- Use `next/image`, `next/link` e `next/font` em vez de `<img>`, `<a>` internos e fontes externas manuais.
- Textos de interface em pt-BR; valores monetários e datas formatados com `Intl` no padrão `pt-BR` (ex.: R$ 1.234,56).

## Dados financeiros
- Nunca use `number` de ponto flutuante para somar ou calcular valores monetários; trabalhe em centavos (inteiros) ou com biblioteca decimal, no servidor.
- Não exponha dados de clientes além do necessário para a tela.
