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
| Visão geral | Cartões macro (IPCA 12m × meta, Selic, CDI, dólar, juro real, IGP-M 12m) e de mercado (inflação implícita 5a, IMA-B no mês, spread de debêntures IPCA+), destaques automáticos, alerta de dados desatualizados | BCB, ANBIMA |
| Inflação | IPCA e IGP-M 12m com a banda da meta, variações mensais, spread IGP-M − IPCA, inflação implícita de 5 anos, tabela mês a mês | BCB, ANBIMA |
| Juros e curvas | Curvas pré e real (hoje × 1 mês × 1 ano), vértices-chave com deslocamentos em bps, inclinação 10a − 2a, real e implícita 5a, Selic e CDI, decisões do Copom | BCB, ANBIMA |
| Câmbio | PTAX dólar e euro: último, máxima, mínima, média e volatilidade | BCB |
| Títulos públicos | Taxas indicativas ANBIMA com variação em bps, spread do varejo, Tesouro Direto (taxas, PU, mínimo/máximo 12m, média e percentil 5 anos, histórico) | ANBIMA, Tesouro Transparente |
| Crédito privado | Spread por indexador e duration (quartis e mediana), histórico da mediana, maiores variações do dia, busca por código ou emissor | ANBIMA |
| Índices ANBIMA | Família IMA: retornos, duration, base 100, % do CDI e R$ 10.000 no período | ANBIMA |
| Comparativo | Base 100 e ranking de R$ 10.000 com % do CDI (CDI, poupança, IPCA, dólar, IMA-B, IRF-M, IMA-S) | BCB, ANBIMA |
| Relatórios | Planilha Google do mês (Resumo, Destaques, Curvas, Renda fixa, Crédito, Tesouro Direto, Comparativo, Séries, Notas), `.xlsx`, **rascunho** no Gmail | Google |
| Agenda | Próximas 10 reuniões do Google Agenda do usuário | Google |
| Assistente | Chat (Gemini) sobre os dados do filtro da tela e o resumo de mercado mais recente | Gemini |

As telas de mercado mostram um aviso enquanto não houver dados: a coleta ANBIMA só roda com
`COLETA_ANBIMA_B3_ATIVA=true` (pendente de validação de licença). **Futuros B3** continua "em breve": o serviço do
Boletim Diário da B3 (`arquivos.b3.com.br/bdi`) estava fora do ar (HTTP 502) e o endereço antigo de ajustes foi
desativado, então o coletor ainda não foi escrito. A tabela `b3_ajustes` e a função `di1_curva` já existem.
## Filtros
Período na URL (`?periodo=mes|ano|12m|24m|5a` ou `?periodo=personalizado&inicio=AAAA-MM-DD&fim=AAAA-MM-DD`).
Padrão: 12 meses. O fim é limitado a hoje e o período a 10 anos.

## Estrutura do código
- `app/` — rotas (páginas só exibem; não calculam).
- `components/` — componentes de interface.
- `lib/` — regras de negócio e integrações (`indicadores/`, `destaques/`, `relatorios/`, `google/`, `assistente/`, `auth/`, `supabase/`).
- `supabase/migrations/` — tabelas, RLS e funções de cálculo (aplicadas com `python supabase/aplicar_migrations.py`).
- `coletores/` — coletores Python (BCB, Tesouro Direto, feriados, ANBIMA: títulos, curvas, IMA e debêntures).
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
