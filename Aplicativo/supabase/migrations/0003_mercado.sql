-- Portal Perfin — dados de mercado (ANBIMA, Tesouro Direto, B3).
-- Leitura só por administradores; escrita só pelos coletores (secret key, ignora RLS).

create table public.curvas_parametros (
  data date not null,
  curva text not null check (curva in ('pre', 'real')),
  beta1 numeric(20, 10) not null,
  beta2 numeric(20, 10) not null,
  beta3 numeric(20, 10) not null,
  beta4 numeric(20, 10) not null,
  lambda1 numeric(20, 10) not null,
  lambda2 numeric(20, 10) not null,
  primary key (data, curva)
);

create table public.curvas_vertices (
  data date not null,
  curva text not null check (curva in ('pre', 'real', 'implicita')),
  du integer not null check (du > 0),
  taxa numeric(12, 6) not null,
  primary key (data, curva, du)
);

create table public.titulos_publicos (
  data date not null,
  tipo text not null check (tipo in ('LTN', 'NTN-F', 'NTN-B', 'NTN-C', 'LFT')),
  vencimento date not null,
  codigo_selic text,
  taxa_compra numeric(12, 6),
  taxa_venda numeric(12, 6),
  taxa_indicativa numeric(12, 6) not null,
  pu numeric(20, 8) not null,
  desvio_padrao numeric(12, 6),
  intervalo_min numeric(12, 6),
  intervalo_max numeric(12, 6),
  duration_du integer,
  primary key (data, tipo, vencimento)
);

create table public.tesouro_direto (
  data date not null,
  titulo text not null,
  vencimento date not null,
  taxa_compra numeric(12, 6),
  taxa_venda numeric(12, 6),
  pu_compra numeric(20, 8),
  pu_venda numeric(20, 8),
  pu_base numeric(20, 8),
  primary key (data, titulo, vencimento)
);

create table public.indices_anbima (
  data date not null,
  indice text not null,
  numero_indice numeric(20, 8) not null,
  variacao_dia numeric(12, 6),
  variacao_mes numeric(12, 6),
  variacao_ano numeric(12, 6),
  variacao_12m numeric(12, 6),
  duration_du integer,
  primary key (data, indice)
);

create table public.debentures (
  data date not null,
  codigo text not null,
  emissor text not null,
  vencimento date,
  indexador text not null,
  taxa_compra numeric(12, 6),
  taxa_venda numeric(12, 6),
  taxa_indicativa numeric(12, 6) not null,
  desvio_padrao numeric(12, 6),
  pu numeric(20, 8),
  pct_pu_par numeric(12, 6),
  duration_du integer,
  referencia_ntnb date,
  primary key (data, codigo)
);
create index debentures_codigo_idx on public.debentures (codigo, data desc);

create table public.b3_ajustes (
  data date not null,
  mercadoria text not null,
  vencimento_codigo text not null,
  vencimento date not null,
  ajuste_anterior numeric(20, 8),
  ajuste_atual numeric(20, 8) not null,
  variacao numeric(20, 8),
  valor_ajuste_contrato numeric(20, 8),
  primary key (data, mercadoria, vencimento_codigo)
);

-- Mesmo padrão de RLS para todas as tabelas de mercado.
do $$
declare
  t text;
begin
  foreach t in array array['curvas_parametros', 'curvas_vertices', 'titulos_publicos',
    'tesouro_direto', 'indices_anbima', 'debentures', 'b3_ajustes']
  loop
    execute format('create index %I on public.%I (data)', t || '_data_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "admin lê %s" on public.%I for select to authenticated using ((select public.eh_admin()))',
      t, t);
  end loop;
end
$$;
