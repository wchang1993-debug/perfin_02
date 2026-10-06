-- Portal Perfin — funções de mercado (regras A3.9 a A3.18): curvas, títulos, crédito, índices e DI1.
-- security invoker: o RLS das tabelas vale dentro das funções. Diferenças de taxa em bps.

-- Data disponível N pregões antes de p_data, considerando as datas presentes na tabela de curvas.
create function public.data_curva_anterior(p_data date, p_pregoes integer)
returns date
language sql
stable
set search_path = ''
as $$
  select d.data from (
    select distinct v.data from public.curvas_vertices v where v.data <= p_data order by v.data desc
  ) d offset p_pregoes limit 1;
$$;

-- Vértices-chave (6m, 1a, 2a, 3a, 5a, 10a) das curvas pré, real e implícita numa data.
-- Usa o vértice publicado; sem ele, a taxa vem dos parâmetros Svensson.
create function public.vertices_chave(p_data date)
returns table (du integer, pre numeric, "real" numeric, implicita numeric)
language sql
stable
set search_path = ''
as $$
  with prazos(du) as (values (126), (252), (504), (756), (1260), (2520)),
  taxas as (
    select p.du,
      coalesce((select v.taxa from public.curvas_vertices v where v.data = p_data and v.curva = 'pre' and v.du = p.du),
               public.svensson(p_data, 'pre', p.du)) as pre,
      coalesce((select v.taxa from public.curvas_vertices v where v.data = p_data and v.curva = 'real' and v.du = p.du),
               public.svensson(p_data, 'real', p.du)) as "real",
      (select v.taxa from public.curvas_vertices v where v.data = p_data and v.curva = 'implicita' and v.du = p.du) as publicada
    from prazos p
  )
  select t.du, round(t.pre, 4), round(t."real", 4),
         round(coalesce(t.publicada, ((1 + t.pre / 100) / (1 + t."real" / 100) - 1) * 100), 4)
  from taxas t
  order by t.du;
$$;

-- Deslocamento dos vértices-chave contra 1, 5, 21 e 252 pregões antes (bps).
create function public.deslocamento_curvas(p_data date)
returns table (du integer, pre numeric, "real" numeric, implicita numeric,
               pre_1d numeric, pre_5d numeric, pre_21d numeric, pre_252d numeric,
               real_1d numeric, real_5d numeric, real_21d numeric, real_252d numeric)
language sql
stable
set search_path = ''
as $$
  select h.du, h.pre, h."real", h.implicita,
    round((h.pre - d1.pre) * 100, 1), round((h.pre - d5.pre) * 100, 1),
    round((h.pre - d21.pre) * 100, 1), round((h.pre - d252.pre) * 100, 1),
    round((h."real" - d1."real") * 100, 1), round((h."real" - d5."real") * 100, 1),
    round((h."real" - d21."real") * 100, 1), round((h."real" - d252."real") * 100, 1)
  from public.vertices_chave(p_data) h
  left join public.vertices_chave(public.data_curva_anterior(p_data, 1)) d1 on d1.du = h.du
  left join public.vertices_chave(public.data_curva_anterior(p_data, 5)) d5 on d5.du = h.du
  left join public.vertices_chave(public.data_curva_anterior(p_data, 21)) d21 on d21.du = h.du
  left join public.vertices_chave(public.data_curva_anterior(p_data, 252)) d252 on d252.du = h.du
  order by h.du;
$$;

-- Curva completa (vértices publicados) numa data, para os gráficos.
create function public.curva_completa(p_data date)
returns table (du integer, pre numeric, "real" numeric, implicita numeric)
language sql
stable
set search_path = ''
as $$
  select v.du,
    max(v.taxa) filter (where v.curva = 'pre'),
    max(v.taxa) filter (where v.curva = 'real'),
    max(v.taxa) filter (where v.curva = 'implicita')
  from public.curvas_vertices v
  where v.data = p_data
  group by v.du
  order by v.du;
$$;

-- Histórico de um vértice-chave (inclinação e implícita ao longo do tempo).
create function public.historico_vertices(p_inicio date, p_fim date)
returns table (data date, pre_2a numeric, pre_10a numeric, inclinacao_bps numeric, implicita_5a numeric, real_5a numeric)
language sql
stable
set search_path = ''
as $$
  select d.data,
    max(v.taxa) filter (where v.curva = 'pre' and v.du = 504),
    max(v.taxa) filter (where v.curva = 'pre' and v.du = 2520),
    round((max(v.taxa) filter (where v.curva = 'pre' and v.du = 2520)
         - max(v.taxa) filter (where v.curva = 'pre' and v.du = 504)) * 100, 1),
    max(v.taxa) filter (where v.curva = 'implicita' and v.du = 1260),
    max(v.taxa) filter (where v.curva = 'real' and v.du = 1260)
  from (select distinct data from public.curvas_vertices where data between p_inicio and p_fim) d
  join public.curvas_vertices v on v.data = d.data
  group by d.data
  order by d.data;
$$;

-- Títulos públicos ANBIMA com variação da taxa indicativa (bps) em 1, 5 e 21 pregões.
create function public.titulos_variacao(p_data date)
returns table (tipo text, vencimento date, codigo_selic text, taxa_indicativa numeric, pu numeric,
               intervalo_min numeric, intervalo_max numeric, var_1d numeric, var_5d numeric, var_21d numeric)
language sql
stable
set search_path = ''
as $$
  with datas as (
    select array_agg(data order by data desc) as d
    from (select distinct data from public.titulos_publicos where data <= p_data order by data desc limit 22) x
  )
  select t.tipo, t.vencimento, t.codigo_selic, t.taxa_indicativa, t.pu, t.intervalo_min, t.intervalo_max,
    round((t.taxa_indicativa - a1.taxa_indicativa) * 100, 1),
    round((t.taxa_indicativa - a5.taxa_indicativa) * 100, 1),
    round((t.taxa_indicativa - a21.taxa_indicativa) * 100, 1)
  from datas, public.titulos_publicos t
  left join public.titulos_publicos a1 on a1.tipo = t.tipo and a1.vencimento = t.vencimento and a1.data = (select d[2] from datas)
  left join public.titulos_publicos a5 on a5.tipo = t.tipo and a5.vencimento = t.vencimento and a5.data = (select d[6] from datas)
  left join public.titulos_publicos a21 on a21.tipo = t.tipo and a21.vencimento = t.vencimento and a21.data = (select d[22] from datas)
  where t.data = (select d[1] from datas)
  order by t.tipo, t.vencimento;
$$;

-- Spread do varejo: taxa de compra do Tesouro Direto contra a indicativa ANBIMA do título equivalente
-- (mesmo vencimento). Positivo = o investidor do Tesouro Direto recebe menos que o mercado.
create function public.spread_varejo(p_data date)
returns table (titulo text, vencimento date, tipo_anbima text, taxa_tesouro numeric, taxa_anbima numeric, spread_bps numeric)
language sql
stable
set search_path = ''
as $$
  with mapa(titulo, tipo) as (values
    ('Tesouro Prefixado', 'LTN'), ('Tesouro Prefixado com Juros Semestrais', 'NTN-F'),
    ('Tesouro IPCA+', 'NTN-B'), ('Tesouro IPCA+ com Juros Semestrais', 'NTN-B'), ('Tesouro Selic', 'LFT')),
  dia as (
    select max(t.data) as data from public.tesouro_direto t
    where t.data <= p_data and exists (select 1 from public.titulos_publicos a where a.data = t.data)
  )
  select td.titulo, td.vencimento, m.tipo, td.taxa_compra, a.taxa_indicativa,
         round((a.taxa_indicativa - td.taxa_compra) * 100, 1)
  from dia
  join public.tesouro_direto td on td.data = dia.data
  join mapa m on m.titulo = td.titulo
  join public.titulos_publicos a on a.data = td.data and a.tipo = m.tipo and a.vencimento = td.vencimento
  where td.taxa_compra is not null
  order by td.titulo, td.vencimento;
$$;

-- Spread de crédito de cada debênture (bps):
--   IPCA+: taxa indicativa − taxa indicativa da NTN-B de referência no mesmo dia
--   DI+:   o próprio spread sobre o DI
--   PRE:   taxa − curva pré ANBIMA (Svensson) na duration da debênture
--   %DI:   sem spread em bps (a taxa já é o percentual do DI)
create function public.spreads_debentures(p_data date)
returns table (codigo text, emissor text, indexador text, vencimento date, duration_du integer, faixa text,
               taxa_indicativa numeric, spread_bps numeric)
language sql
stable
set search_path = ''
as $$
  select d.codigo, d.emissor, d.indexador, d.vencimento, d.duration_du,
    case when d.duration_du is null then null
         when d.duration_du <= 504 then 'até 2 anos'
         when d.duration_du <= 1260 then '2 a 5 anos'
         else 'acima de 5 anos' end,
    d.taxa_indicativa,
    round(case d.indexador
      when 'IPCA+' then (d.taxa_indicativa - n.taxa_indicativa) * 100
      when 'DI+' then d.taxa_indicativa * 100
      when 'PRE' then (d.taxa_indicativa - public.svensson(p_data, 'pre', greatest(d.duration_du, 21))) * 100
    end, 1)
  from public.debentures d
  left join public.titulos_publicos n
    on d.indexador = 'IPCA+' and n.data = d.data and n.tipo = 'NTN-B' and n.vencimento = d.referencia_ntnb
  where d.data = p_data;
$$;

-- Mediana e quartis do spread por indexador e faixa de duration.
create function public.resumo_spreads(p_data date)
returns table (indexador text, faixa text, quantidade integer, p25 numeric, mediana numeric, p75 numeric)
language sql
stable
set search_path = ''
as $$
  select s.indexador, coalesce(s.faixa, 'todas'), count(*)::integer,
    round(percentile_cont(0.25) within group (order by s.spread_bps)::numeric, 1),
    round(percentile_cont(0.5) within group (order by s.spread_bps)::numeric, 1),
    round(percentile_cont(0.75) within group (order by s.spread_bps)::numeric, 1)
  from public.spreads_debentures(p_data) s
  where s.spread_bps is not null
  group by grouping sets ((s.indexador), (s.indexador, s.faixa))
  order by s.indexador, s.faixa nulls first;
$$;

-- Histórico da mediana de spread por indexador (abrindo = estresse; fechando = apetite).
create function public.mediana_spreads_hist(p_inicio date, p_fim date)
returns table (data date, indexador text, mediana numeric, quantidade integer)
language sql
stable
set search_path = ''
as $$
  select d.data, s.indexador,
    round(percentile_cont(0.5) within group (order by s.spread_bps)::numeric, 1), count(*)::integer
  from (select distinct data from public.debentures where data between p_inicio and p_fim) d
  cross join lateral public.spreads_debentures(d.data) s
  where s.spread_bps is not null
  group by d.data, s.indexador
  order by d.data, s.indexador;
$$;

-- Maiores variações de taxa indicativa no dia (bps) — sinal de estresse por emissor.
create function public.maiores_variacoes_debentures(p_data date, p_quantidade integer)
returns table (codigo text, emissor text, indexador text, taxa_anterior numeric, taxa_atual numeric, variacao_bps numeric)
language sql
stable
set search_path = ''
as $$
  with anterior as (select max(data) as data from public.debentures where data < p_data)
  select h.codigo, h.emissor, h.indexador, a.taxa_indicativa, h.taxa_indicativa,
         round((h.taxa_indicativa - a.taxa_indicativa) * 100, 1) as variacao
  from public.debentures h
  join anterior on true
  join public.debentures a on a.codigo = h.codigo and a.data = anterior.data
  where h.data = p_data
  order by abs(h.taxa_indicativa - a.taxa_indicativa) desc
  limit p_quantidade;
$$;

-- Índices ANBIMA: desempenho no período a partir do número-índice e base 100.
create function public.indices_desempenho(p_indices text[], p_inicio date, p_fim date)
returns table (indice text, rentabilidade numeric, valor_final numeric, duration_du integer)
language sql
stable
set search_path = ''
as $$
  select x.indice, round((x.ultimo / x.primeiro - 1) * 100, 6),
         round(10000 * x.ultimo / x.primeiro, 2), x.duration_du
  from (
    select i.indice,
      (array_agg(i.numero_indice order by i.data))[1] as primeiro,
      (array_agg(i.numero_indice order by i.data desc))[1] as ultimo,
      (array_agg(i.duration_du order by i.data desc))[1] as duration_du
    from public.indices_anbima i
    where i.indice = any (p_indices) and i.data between p_inicio and p_fim
    group by i.indice
  ) x
  order by 2 desc;
$$;

create function public.indices_base100(p_indices text[], p_inicio date, p_fim date)
returns table (indice text, data date, valor numeric)
language sql
stable
set search_path = ''
as $$
  select i.indice, i.data,
    round(100 * i.numero_indice / first_value(i.numero_indice) over (partition by i.indice order by i.data), 4)
  from public.indices_anbima i
  where i.indice = any (p_indices) and i.data between p_inicio and p_fim
  order by i.indice, i.data;
$$;

-- Curva DI1 (B3): taxa implícita por vencimento a partir do PU de ajuste, e termo entre vencimentos.
create function public.di1_curva(p_data date)
returns table (vencimento_codigo text, vencimento date, du integer, pu numeric, taxa numeric, termo numeric)
language sql
stable
set search_path = ''
as $$
  with base as (
    select a.vencimento_codigo, a.vencimento, public.dias_uteis(a.data, a.vencimento) as du, a.ajuste_atual as pu
    from public.b3_ajustes a
    where a.data = p_data and a.mercadoria = 'DI1' and a.vencimento > a.data
  ),
  taxas as (select b.*, public.taxa_di1(b.pu, b.du) as taxa from base b where b.du > 0)
  select t.vencimento_codigo, t.vencimento, t.du, t.pu, t.taxa,
    public.taxa_termo(lag(t.taxa) over (order by t.du), lag(t.du) over (order by t.du), t.taxa, t.du)
  from taxas t
  order by t.du;
$$;

-- Última data disponível de cada fonte de mercado (para filtros e alertas).
create function public.datas_mercado()
returns table (fonte text, ultima_data date)
language sql
stable
set search_path = ''
as $$
  select 'curvas', max(data) from public.curvas_vertices
  union all select 'titulos', max(data) from public.titulos_publicos
  union all select 'indices', max(data) from public.indices_anbima
  union all select 'debentures', max(data) from public.debentures
  union all select 'tesouro', max(data) from public.tesouro_direto
  union all select 'b3', max(data) from public.b3_ajustes;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'data_curva_anterior(date, integer)', 'vertices_chave(date)', 'deslocamento_curvas(date)',
    'curva_completa(date)', 'historico_vertices(date, date)', 'titulos_variacao(date)', 'spread_varejo(date)',
    'spreads_debentures(date)', 'resumo_spreads(date)', 'mediana_spreads_hist(date, date)',
    'maiores_variacoes_debentures(date, integer)', 'indices_desempenho(text[], date, date)',
    'indices_base100(text[], date, date)', 'di1_curva(date)', 'datas_mercado()']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end
$$;
