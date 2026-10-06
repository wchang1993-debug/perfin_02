# Regras de cálculo e destaques

Todos os cálculos rodam no Postgres em `numeric` (funções em `Aplicativo/supabase/migrations/0004_funcoes_calculo.sql`
e `0005_tesouro_direto.sql`). A interface só formata. Taxas em %: 0,56 significa 0,56%.

## Fórmulas

| Regra | Fórmula | Função SQL |
|---|---|---|
| Acumulado de taxas (mensais ou diárias) | `(∏(1 + v/100) − 1) · 100` | `acumulado_periodo` |
| Variação de cotação | `(último / primeiro − 1) · 100` | `acumulado_periodo` |
| Taxa anual (Selic meta, CDI a.a.) | último valor do período | `acumulado_periodo` |
| Acumulado em 12 meses (janela móvel) | composição dos 12 últimos meses; só meses com 12 observações | `serie_12m` |
| Juro real ex-post 12m | `((1 + CDI_12m) / (1 + IPCA_12m) − 1) · 100` | `juro_real_12m` |
| Meta de inflação | IPCA 12m contra centro ± tolerância (`metas_inflacao`); conta meses seguidos fora da banda | `status_meta_inflacao` |
| % do CDI | `r_ativo / r_CDI · 100`; "n/d" se `r_CDI ≤ 0` | `percentualDoCdi` (`lib/indicadores/painel.ts`) |
| Câmbio | variação, máx./mín. com datas, média e volatilidade `dp(ln(Pt/Pt−1)) · √252` | `estatisticas_cambio` |
| Copom | datas em que a Selic meta mudou e o tamanho da mudança | `decisoes_copom` |
| Base 100 | taxas: `100 · ∏(1 + v/100)`; cotações: `100 · v / v₀` | `serie_base100` |
| R$ 10.000 | `round(10000 · (1 + r/100), 2)` | `simulacao_10mil` |
| Dias úteis | dias em `(início, fim]`, sem fins de semana e feriados (`feriados`) | `dias_uteis` |
| Svensson (ANBIMA) | `y(t) = β1 + β2·L1 + β3·(L1 − e^(−λ1t)) + β4·(L2 − e^(−λ2t))`, `Li = (1 − e^(−λi t))/(λi t)`, `t = du/252` | `svensson` |
| Taxa DI1 | `(100.000 / PU)^(252/du) − 1` | `taxa_di1` |
| Taxa a termo | `((1+r2)^(du2/252) / (1+r1)^(du1/252))^(252/(du2−du1)) − 1` | `taxa_termo` |
| Tesouro Direto | mínimo e máximo 12m, média 5 anos e percentil 5 anos da taxa de venda | `tesouro_direto_resumo` |
| Vértices-chave | 6m, 1, 2, 3, 5 e 10 anos: vértice publicado pela ANBIMA; sem ele, Svensson. Implícita: `(1+pré)/(1+real) − 1` | `vertices_chave` |
| Deslocamento de curva | Δ da taxa em bps contra 1, 5, 21 e 252 pregões antes (datas coletadas) | `deslocamento_curvas` |
| Inclinação | pré 10 anos − pré 2 anos, em bps | `historico_vertices` |
| Títulos públicos | Δ da taxa indicativa ANBIMA em bps (1, 5 e 21 pregões) | `titulos_variacao` |
| Spread do varejo | indicativa ANBIMA − taxa de compra do Tesouro Direto, mesmo vencimento (LTN, NTN-F, NTN-B, LFT), em bps | `spread_varejo` |
| Spread de debênture | IPCA+: indicativa − NTN-B de referência; DI+: o próprio spread; prefixada: indicativa − curva pré (Svensson) na duration; %DI: sem spread em bps | `spreads_debentures` |
| Faixas de duration | até 2 anos (≤ 504 du), 2 a 5 anos (≤ 1.260 du), acima de 5 anos | `spreads_debentures` |
| Resumo de crédito | 1º quartil, mediana e 3º quartil do spread por indexador e faixa | `resumo_spreads` |
| Variação de debênture | Δ da taxa indicativa contra o dia anterior coletado, em bps | `maiores_variacoes_debentures` |
| Índices ANBIMA | `(último / primeiro número-índice − 1) · 100`; base 100 sobre o primeiro dia do período | `indices_desempenho`, `indices_base100` |

Séries mensais do BCB são datadas no dia 1º do mês; os filtros consideram o mês da data de início.

### Conferências manuais (validadas no banco)
- IPCA de 0,50%, 0,40% e 0,30% → acumulado de **1,2047%** (1,005 × 1,004 × 1,003 − 1).
- PU do DI1 de 90.000 com 252 du → **11,1111%** a.a.
- 10% em 252 du e 12% em 504 du → termo de **14,0364%** a.a.
- Semana do Carnaval de 2026 (13/02 a 20/02) → **3** dias úteis.
- Svensson com os parâmetros ANBIMA de 05/10/2026 → curva pré em 252 du de **12,6798%**, igual ao vértice publicado.

## Dados desatualizados
- Série diária: mais de 2 dias úteis sem dado.
- Série mensal: mais de 45 dias depois do fim do mês de referência.

## Destaques automáticos (`lib/destaques/macro.ts`)
No máximo 6, priorizados por severidade ("atenção" antes de "informativo") e depois por raridade.

| Regra | Quando aparece | Severidade |
|---|---|---|
| Meta de inflação | sempre que houver IPCA 12m; fora da banda vira atenção; 6+ meses fora menciona descumprimento | atenção / informativo |
| Prévia do IPCA | IPCA-15 do mês já saiu e o IPCA do mesmo mês ainda não | informativo |
| Juro real | sempre que calculável | informativo |
| IGP-M × IPCA | diferença em 12 meses ≥ 1 p.p. (`LIMIAR_SPREAD_IGPM_IPCA`) | informativo |
| Câmbio | variação do dólar no período ≥ 3% (`LIMIAR_VARIACAO_CAMBIO`) | atenção |
| Poupança | % do CDI no período, quando calculável | informativo |
| Copom | Selic atual e última mudança; 2+ decisões seguidas na mesma direção ganham destaque | informativo |

### Destaques de mercado (`lib/destaques/mercado.ts`)

| Regra | Quando aparece | Severidade |
|---|---|---|
| Inclinação da curva pré | 10a − 2a mudou ≥ 15 bps na semana (`LIMIAR_INCLINACAO_BPS`) | informativo |
| Inflação implícita 5a | sempre; acima do teto da meta vira atenção | atenção / informativo |
| NTN-B mais longa | taxa andou ≥ 20 bps na semana (`LIMIAR_NTNB_SEMANA_BPS`) | informativo |
| Spread do varejo | maior spread positivo entre Tesouro Direto e ANBIMA | informativo |
| IMA-B | variação no mês e % do CDI do mês | informativo |
| Crédito | mediana IPCA+ mudou ≥ 10 bps em ~1 mês (`LIMIAR_SPREAD_CREDITO_BPS`); abrindo vira atenção | atenção / informativo |
| Debênture no dia | taxa indicativa andou ≥ 100 bps no dia (`LIMIAR_DEBENTURE_DIA_BPS`), até 2 debêntures | atenção |

## Relatório do mês
- Mês padrão: último mês com IPCA divulgado.
- Status **Completo** quando IPCA, IPCA-15, INPC, IGP-M e poupança do mês estão disponíveis; senão **Preliminar**, com a lista do que falta.
- Abas: Resumo, Destaques, Curvas, Renda fixa, Crédito, Tesouro Direto, Comparativo, Séries (24 meses) e Notas (fontes, fórmulas e aviso legal).
- Mercado: último dia coletado até o fim do mês, comparado com o último dia até o fim do mês anterior. Abas sem dados não são criadas.
- O aviso legal cita a ANBIMA apenas quando há dados dela no relatório.
- O Portal só cria **rascunhos** no Gmail; o envio é sempre feito pela pessoa.
