-- Portal Perfin — leitura do Tesouro Direto (regra A3.17): taxa atual frente ao histórico.

create function public.tesouro_direto_resumo()
returns table (titulo text, vencimento date, data date, taxa_compra numeric, taxa_venda numeric,
               pu_compra numeric, pu_venda numeric, minimo_12m numeric, maximo_12m numeric,
               media_5a numeric, percentil_5a numeric)
language sql
stable
set search_path = ''
as $$
  with ultima as (select max(t.data) as data from public.tesouro_direto t)
  select t.titulo, t.vencimento, t.data, t.taxa_compra, t.taxa_venda, t.pu_compra, t.pu_venda,
         h.minimo_12m, h.maximo_12m, h.media_5a, h.percentil_5a
  from public.tesouro_direto t
  join ultima u on t.data = u.data
  cross join lateral (
    select
      min(x.taxa_venda) filter (where x.data > u.data - interval '12 months') as minimo_12m,
      max(x.taxa_venda) filter (where x.data > u.data - interval '12 months') as maximo_12m,
      round(avg(x.taxa_venda), 4) as media_5a,
      -- Percentil da taxa atual nos últimos 5 anos: 100 = maior taxa do período.
      round(100.0 * count(*) filter (where x.taxa_venda <= t.taxa_venda) / nullif(count(*), 0), 1) as percentil_5a
    from public.tesouro_direto x
    where x.titulo = t.titulo and x.vencimento = t.vencimento
      and x.data > u.data - interval '5 years' and x.taxa_venda is not null
  ) h
  order by t.titulo, t.vencimento;
$$;

revoke all on function public.tesouro_direto_resumo() from public, anon;
grant execute on function public.tesouro_direto_resumo() to authenticated, service_role;
