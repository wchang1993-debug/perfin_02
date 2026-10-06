# 0003 — PWA sem cache de dados financeiros

- **Data:** 06/10/2026
- **Status:** aceita

## Contexto
O time quer instalar o Portal no celular e no desktop. Um service worker pode guardar respostas em cache, o que
deixaria dados financeiros e de sessão no aparelho.

## Decisão
- PWA com `app/manifest.ts` (recurso nativo do Next.js) e um service worker escrito à mão (`public/sw.js`), sem dependência nova.
- O SW guarda em cache **apenas** arquivos estáticos (`/_next/static`, ícones) e a página `/offline`.
  Páginas e `/api` vão sempre à rede; sem conexão, aparece `/offline`.
- `sw.js` é servido com `Cache-Control: no-cache` para que atualizações cheguem; o app avisa "nova versão disponível".

## Alternativas consideradas
- **Serwist / next-pwa**: mais recursos (precache automático), mas uma dependência a mais para um uso simples.

## Consequências
- O Portal não funciona offline (por decisão de segurança).
- Os ícones atuais são provisórios; devem ser trocados pelo selo oficial (guilloché) extraído de `wealth.pdf`.
- Login OAuth no PWA instalado no iOS deve ser testado (o iOS pode abrir o fluxo no Safari).
