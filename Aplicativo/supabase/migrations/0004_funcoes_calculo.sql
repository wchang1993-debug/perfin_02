-- Portal Perfin — funções de cálculo (regras A3 do plano).
-- Todas são security invoker: o RLS vale dentro delas (só administradores enxergam dados).
-- Contas em numeric no banco; a interface só formata.

-- Dias úteis no intervalo (inicio, fim]: exclui o início e inclui o fim (convenção de mercado).
create function public.dias_uteis(p_inicio date, p_fim date)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from generate_series(p_inicio + 1, p_fim, interval '1 day') as d
  where extract(isodow from d) < 6
    and not exists (select 1 from public.feriados f where f.data = d::date);
$$;

-- Acumulado de um indicador no período, conforme o tipo:
--   taxa_mensal/taxa_diaria: (∏(1+v/100) − 1)·100
--   cotacao: (último/primeiro − 1)·100
--   taxa_anual: último valor (nível)
-- Séries mensais são datadas no dia 1º; o filtro usa o mês de p_inicio.
create function public.acumulado_periodo(p_codigo text, p_inicio date, p_fim date)
returns numeric
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tipo text;
  v_periodicidade text;
  v_inicio date;
  v_resultado numeric;
begin
  select i.tipo, i.periodicidade into v_tipo, v_periodicidade
  from public.indicadores i where i.codigo = p_codigo;
  if v_tipo is null then
    raise exception 'Indicador desconhecido: %', p_codigo;
  end if;

  v_inicio := case when v_periodicidade = 'mensal'
    then date_trunc('month', p_inicio)::date else p_inicio end;

  if v_tipo in ('taxa_mensal', 'taxa_diaria') then
    select (exp(sum(ln(1 + v.valor / 100))) - 1) * 100 into v_resultado
    from public.indicadores_valores v
    where v.indicador_codigo = p_codigo and v.data between v_inicio and p_fim;
  elsif v_tipo = 'cotacao' then
    select (max(case when rn_fim = 1 then valor end) / nullif(max(case when rn_ini = 1 then valor end), 0) - 1) * 100
      into v_resultado
    from (
      select v.valor,
        row_number() over (order by v.data) as rn_ini,
        row_number() over (order by v.data desc) as rn_fim
      from public.indicadores_valores v
      where v.indicador_codigo = p_codigo and v.data between v_inicio and p_fim
    ) s;
  else
    select v.valor into v_resultado
    from public.indicadores_valores v
    where v.indicador_codigo = p_codigo and v.data between v_inicio and p_fim
    order by v.data desc limit 1;
  end if;

  return round(v_resultado, 6);
end;
$$;

-- Acumulado em 12 meses (janela móvel) de uma série mensal; só meses com 12 observações.
create function public.serie_12m(p_codigo text, p_inicio date, p_fim date)
returns table (data date, valor_mes numeric, acumulado_12m numeric)
language sql
stable
set search_path = ''
as $$
  select s.data, s.valor, round(s.acum, 6)
  from (
    select v.data, v.valor,
      (exp(sum(ln(1 + v.valor / 100)) over w) - 1) * 100 as acum,
      count(*) over w as n
    from public.indicadores_valores v
    where v.indicador_codigo = p_codigo
      and v.data between (date_trunc('month', p_inicio) - interval '11 months')::date and p_fim
    window w as (order by v.data rows between 11 preceding and current row)
  ) s
  where s.n = 12 and s.data >= date_trunc('month', p_inicio)::date
  order by s.data;
$$;

-- Juro real ex-post em 12 meses terminados no mês p_mes: ((1+CDI)/(1+IPCA) − 1)·100.
create function public.juro_real_12m(p_mes date)
returns numeric
language sql
stable
set search_path = ''
as $$
  with janela as (
    select (date_trunc('month', p_mes) - interval '11 months')::date as inicio,
           (date_trunc('month', p_mes) + interval '1 month - 1 day')::date as fim
  )
  select round(((1 + public.acumulado_periodo('CDI', inicio, fim) / 100)
              / (1 + public.acumulado_periodo('IPCA', inicio, fim) / 100) - 1) * 100, 6)
  from janela;
$$;

-- Status do IPCA 12m frente à meta do ano e meses consecutivos fora da banda.
create function public.status_meta_inflacao(p_mes date)
returns table (mes date, ipca_12m numeric, centro numeric, piso numeric, teto numeric,
               status text, meses_fora integer)
language plpgsql
stable
set search_path = ''
as $$
declare
  r record;
  v_fora integer := 0;
  v_ultimo record;
  v_encontrou boolean := false;
begin
  for r in
    select s.data, s.acumulado_12m, m.centro, m.centro - m.tolerancia as piso, m.centro + m.tolerancia as teto
    from public.serie_12m('IPCA', (date_trunc('month', p_mes) - interval '35 months')::date, p_mes) s
    join public.metas_inflacao m on m.ano = extract(year from s.data)
    order by s.data
  loop
    if r.acumulado_12m > r.teto or r.acumulado_12m < r.piso then
      v_fora := v_fora + 1;
    else
      v_fora := 0;
    end if;
    v_ultimo := r;
    v_encontrou := true;
  end loop;

  if not v_encontrou then
    return;
  end if;

  mes := v_ultimo.data;
  ipca_12m := v_ultimo.acumulado_12m;
  centro := v_ultimo.centro;
  piso := v_ultimo.piso;
  teto := v_ultimo.teto;
  status := case
    when v_ultimo.acumulado_12m > v_ultimo.teto then 'acima_do_teto'
    when v_ultimo.acumulado_12m < v_ultimo.piso then 'abaixo_do_piso'
    else 'dentro_da_meta' end;
  meses_fora := v_fora;
  return next;
end;
$$;

-- Estatísticas de uma cotação no período (câmbio).
create function public.estatisticas_cambio(p_codigo text, p_inicio date, p_fim date)
returns table (primeiro numeric, ultimo numeric, variacao numeric, maximo numeric, data_maximo date,
               minimo numeric, data_minimo date, media numeric, volatilidade_aa numeric)
language sql
stable
set search_path = ''
as $$
  with serie as (
    select v.data, v.valor, ln(v.valor / lag(v.valor) over (order by v.data)) as retorno
    from public.indicadores_valores v
    where v.indicador_codigo = p_codigo and v.data between p_inicio and p_fim
  )
  select
    (select valor from serie order by data limit 1),
    (select valor from serie order by data desc limit 1),
    round(((select valor from serie order by data desc limit 1)
      / nullif((select valor from serie order by data limit 1), 0) - 1) * 100, 6),
    (select valor from serie order by valor desc, data limit 1),
    (select data from serie order by valor desc, data limit 1),
    (select valor from serie order by valor, data limit 1),
    (select data from serie order by valor, data limit 1),
    (select round(avg(valor), 6) from serie),
    (select round(stddev_samp(retorno) * sqrt(252::numeric) * 100, 6) from serie);
$$;

-- Decisões do Copom que alteraram a Selic meta (troca de valor na série 432).
create function public.decisoes_copom(p_inicio date, p_fim date)
returns table (data date, selic_anterior numeric, selic_nova numeric, variacao_pp numeric)
language sql
stable
set search_path = ''
as $$
  select s.data, s.anterior, s.valor, s.valor - s.anterior
  from (
    select v.data, v.valor, lag(v.valor) over (order by v.data) as anterior
    from public.indicadores_valores v
    where v.indicador_codigo = 'SELIC'
  ) s
  where s.anterior is not null and s.valor <> s.anterior
    and s.data between p_inicio and p_fim
  order by s.data;
$$;

-- Valores mais recentes (e anteriores) de cada indicador ativo — cartões da visão geral.
create function public.ultimos_valores()
returns table (codigo text, nome text, unidade text, tipo text, periodicidade text,
               casas_decimais smallint, data date, valor numeric, data_anterior date, valor_anterior numeric)
language sql
stable
set search_path = ''
as $$
  select i.codigo, i.nome, i.unidade, i.tipo, i.periodicidade, i.casas_decimais,
         u.data, u.valor, a.data, a.valor
  from public.indicadores i
  left join lateral (
    select v.data, v.valor from public.indicadores_valores v
    where v.indicador_codigo = i.codigo order by v.data desc limit 1
  ) u on true
  left join lateral (
    select v.data, v.valor from public.indicadores_valores v
    where v.indicador_codigo = i.codigo and v.data < u.data order by v.data desc limit 1
  ) a on true
  where i.ativo
  order by i.codigo;
$$;

-- Série em número-índice base 100 no início do período (comparativo).
create function public.serie_base100(p_codigos text[], p_inicio date, p_fim date)
returns table (codigo text, data date, valor numeric)
language sql
stable
set search_path = ''
as $$
  select s.codigo, s.data, round(s.indice, 4)
  from (
    select v.indicador_codigo as codigo, v.data,
      case when i.tipo = 'cotacao'
        then 100 * v.valor / first_value(v.valor) over w
        else 100 * exp(sum(ln(1 + v.valor / 100)) over w)
      end as indice
    from public.indicadores_valores v
    join public.indicadores i on i.codigo = v.indicador_codigo
    where v.indicador_codigo = any (p_codigos)
      and i.tipo in ('taxa_mensal', 'taxa_diaria', 'cotacao')
      and v.data between case when i.periodicidade = 'mensal'
                              then date_trunc('month', p_inicio)::date else p_inicio end
                     and p_fim
    window w as (partition by v.indicador_codigo order by v.data
                 rows between unbounded preceding and current row)
  ) s
  order by s.codigo, s.data;
$$;

-- Simulador: quanto R$ 10.000 aplicados no início do período valeriam no fim (em centavos).
create function public.simulacao_10mil(p_codigos text[], p_inicio date, p_fim date)
returns table (codigo text, nome text, rentabilidade numeric, valor_final numeric)
language sql
stable
set search_path = ''
as $$
  select i.codigo, i.nome, r.rent, round(10000 * (1 + r.rent / 100), 2)
  from public.indicadores i
  cross join lateral (select public.acumulado_periodo(i.codigo, p_inicio, p_fim) as rent) r
  where i.codigo = any (p_codigos)
    and i.tipo in ('taxa_mensal', 'taxa_diaria', 'cotacao')
    and r.rent is not null
  order by r.rent desc;
$$;

-- Indicadores desatualizados (regra A3.19):
--   diários: mais de 2 dias úteis sem dado; mensais: mais de 45 dias após o fim do mês de referência.
create function public.indicadores_desatualizados()
returns table (codigo text, nome text, ultima_data date)
language sql
stable
set search_path = ''
as $$
  select i.codigo, i.nome, u.data
  from public.indicadores i
  left join lateral (
    select max(v.data) as data from public.indicadores_valores v where v.indicador_codigo = i.codigo
  ) u on true
  where i.ativo and (
    u.data is null
    or (i.periodicidade = 'diaria' and public.dias_uteis(u.data, current_date) > 2)
    or (i.periodicidade = 'mensal'
        and current_date > (date_trunc('month', u.data) + interval '1 month - 1 day')::date + 45)
  )
  order by i.codigo;
$$;

-- Taxa Svensson em um prazo (du) a partir dos parâmetros ANBIMA; t = du/252.
create function public.svensson(p_data date, p_curva text, p_du integer)
returns numeric
language sql
stable
set search_path = ''
as $$
  select round((
    p.beta1
    + p.beta2 * ((1 - exp(-p.lambda1 * t)) / (p.lambda1 * t))
    + p.beta3 * ((1 - exp(-p.lambda1 * t)) / (p.lambda1 * t) - exp(-p.lambda1 * t))
    + p.beta4 * ((1 - exp(-p.lambda2 * t)) / (p.lambda2 * t) - exp(-p.lambda2 * t))
  ) * 100, 6)
  from public.curvas_parametros p
  cross join lateral (select p_du::numeric / 252 as t) x
  where p.data = p_data and p.curva = p_curva;
$$;

-- Taxa implícita (% a.a.) de um contrato DI1 a partir do PU de ajuste.
create function public.taxa_di1(p_pu numeric, p_du integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when p_pu > 0 and p_du > 0
    then round((power(100000 / p_pu, 252::numeric / p_du) - 1) * 100, 6) end;
$$;

-- Taxa a termo (% a.a.) entre dois vértices: ((1+r2)^(du2/252)/(1+r1)^(du1/252))^(252/(du2−du1)) − 1.
create function public.taxa_termo(p_taxa1 numeric, p_du1 integer, p_taxa2 numeric, p_du2 integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when p_du2 > p_du1 then round((power(
      power(1 + p_taxa2 / 100, p_du2::numeric / 252) / power(1 + p_taxa1 / 100, p_du1::numeric / 252),
      252::numeric / (p_du2 - p_du1)) - 1) * 100, 6) end;
$$;

-- As funções de leitura só fazem sentido para usuários logados (o RLS já filtra os dados).
do $$
declare
  f text;
begin
  foreach f in array array[
    'dias_uteis(date, date)', 'acumulado_periodo(text, date, date)', 'serie_12m(text, date, date)',
    'juro_real_12m(date)', 'status_meta_inflacao(date)', 'estatisticas_cambio(text, date, date)',
    'decisoes_copom(date, date)', 'ultimos_valores()', 'serie_base100(text[], date, date)',
    'simulacao_10mil(text[], date, date)', 'indicadores_desatualizados()',
    'svensson(date, text, integer)', 'taxa_di1(numeric, integer)',
    'taxa_termo(numeric, integer, numeric, integer)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end
$$;
