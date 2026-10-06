-- Portal Perfin — apoio ao relatório mensal com dados de mercado (fechamento do mês).

-- Última data disponível de uma fonte de mercado até p_ate (ex.: último dia útil coletado do mês).
create function public.ultima_data_mercado(p_fonte text, p_ate date)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_data date;
begin
  case p_fonte
    when 'curvas' then select max(data) into v_data from public.curvas_vertices where data <= p_ate;
    when 'titulos' then select max(data) into v_data from public.titulos_publicos where data <= p_ate;
    when 'indices' then select max(data) into v_data from public.indices_anbima where data <= p_ate;
    when 'debentures' then select max(data) into v_data from public.debentures where data <= p_ate;
    when 'tesouro' then select max(data) into v_data from public.tesouro_direto where data <= p_ate;
    else raise exception 'Fonte desconhecida: %', p_fonte;
  end case;
  return v_data;
end;
$$;

-- Vértices-chave numa data comparados com outra data-base (Δ em bps), ex.: fim do mês × fim do mês anterior.
create function public.comparar_vertices(p_data date, p_data_base date)
returns table (du integer, pre numeric, "real" numeric, implicita numeric,
               delta_pre numeric, delta_real numeric, delta_implicita numeric)
language sql
stable
set search_path = ''
as $$
  select h.du, h.pre, h."real", h.implicita,
    round((h.pre - b.pre) * 100, 1), round((h."real" - b."real") * 100, 1),
    round((h.implicita - b.implicita) * 100, 1)
  from public.vertices_chave(p_data) h
  left join public.vertices_chave(p_data_base) b on b.du = h.du
  order by h.du;
$$;

-- Mediana de spread por indexador numa data comparada com uma data-base (Δ em bps).
create function public.comparar_spreads(p_data date, p_data_base date)
returns table (indexador text, quantidade integer, p25 numeric, mediana numeric, p75 numeric, delta_mediana numeric)
language sql
stable
set search_path = ''
as $$
  select h.indexador, h.quantidade, h.p25, h.mediana, h.p75, h.mediana - b.mediana
  from public.resumo_spreads(p_data) h
  left join public.resumo_spreads(p_data_base) b on b.indexador = h.indexador and b.faixa = h.faixa
  where h.faixa = 'todas'
  order by h.indexador;
$$;

-- Preços e taxas do Tesouro Direto na última data disponível até p_ate.
create function public.tesouro_direto_na_data(p_ate date)
returns table (data date, titulo text, vencimento date, taxa_compra numeric, taxa_venda numeric,
               pu_compra numeric, pu_venda numeric)
language sql
stable
set search_path = ''
as $$
  select t.data, t.titulo, t.vencimento, t.taxa_compra, t.taxa_venda, t.pu_compra, t.pu_venda
  from public.tesouro_direto t
  where t.data = (select max(x.data) from public.tesouro_direto x where x.data <= p_ate)
  order by t.titulo, t.vencimento;
$$;

do $$
declare
  f text;
begin
  foreach f in array array['ultima_data_mercado(text, date)', 'comparar_vertices(date, date)',
    'comparar_spreads(date, date)', 'tesouro_direto_na_data(date)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end
$$;
