# Portal Perfin

Central de análise do time da Perfin Wealth Management. É um PWA (instalável no celular e no desktop) em
Next.js + TypeScript, com banco no Supabase e publicado na Vercel. Código em `Aplicativo/`.

## Acesso
- Login com Google. Só entram os e-mails da variável `ADMIN_EMAILS`; os demais veem "Acesso não autorizado"
  e o usuário criado no Auth é apagado.
- A regra é checada no `proxy.ts`, em cada página, Server Action e Route Handler, e no banco (RLS via
  `public.eh_admin()`, que consulta `administradores`, espelho de `ADMIN_EMAILS` atualizado a cada login).

## Telas disponíveis
| Tela | Conteúdo | Fonte |
|---|---|---|
| Visão geral | Cartões (IPCA 12m × meta, Selic, CDI no período, dólar, juro real, IGP-M 12m), destaques automáticos e alerta de dados desatualizados | BCB |
| Inflação | IPCA e IGP-M 12m com a banda da meta, variações mensais (IPCA, IPCA-15, INPC, IGP-M), spread IGP-M − IPCA, tabela mês a mês | BCB |
| Juros e curvas | Selic meta (degraus) e CDI, CDI acumulado, decisões do Copom | BCB |
| Câmbio | PTAX dólar e euro: último, máxima, mínima, média e volatilidade | BCB |
| Títulos públicos | Tesouro Direto: taxas e PU atuais, mínimo/máximo 12m, média e percentil 5 anos, histórico por título | Tesouro Transparente |
| Comparativo | Base 100 e simulador de R$ 10.000 (CDI, poupança, IPCA, dólar) | BCB |
| Relatórios | Gera Planilha Google do mês (Drive), baixa `.xlsx`, cria **rascunho** no Gmail | Google |
| Agenda | Próximas 10 reuniões do Google Agenda do usuário | Google |
| Assistente | Chat (Gemini) sobre os dados do filtro da tela atual | Gemini |

Crédito privado, Índices ANBIMA e Futuros B3 aparecem como "em breve": as tabelas já existem no banco, mas a
coleta ANBIMA/B3 depende da validação de licença (variável `COLETA_ANBIMA_B3_ATIVA`).

## Filtros
Período na URL (`?periodo=mes|ano|12m|24m|5a` ou `?periodo=personalizado&inicio=AAAA-MM-DD&fim=AAAA-MM-DD`).
Padrão: 12 meses. O fim é limitado a hoje e o período a 10 anos.

## Estrutura do código
- `app/` — rotas (páginas só exibem; não calculam).
- `components/` — componentes de interface.
- `lib/` — regras de negócio e integrações (`indicadores/`, `destaques/`, `relatorios/`, `google/`, `assistente/`, `auth/`, `supabase/`).
- `supabase/migrations/` — tabelas, RLS e funções de cálculo (aplicadas com `python supabase/aplicar_migrations.py`).
- `coletores/` — coletores Python (BCB, Tesouro Direto, feriados).
- `public/sw.js` — service worker do PWA.

## Comandos (na pasta `Aplicativo/`)
| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run typecheck` / `npm run lint` / `npm test` | TypeScript, ESLint e testes (Vitest) |
| `npm run build` | Build de produção |
| `pip install -r coletores/requirements-dev.txt && python -m pytest coletores` | Testes dos coletores |
| `python -m coletores.main macro` | Coleta BCB e Tesouro (exige `SUPABASE_URL` e `SUPABASE_SECRET_KEY`) |
| `python supabase/aplicar_migrations.py` | Aplica migrations pendentes (exige `DATABASE_URL`) |
