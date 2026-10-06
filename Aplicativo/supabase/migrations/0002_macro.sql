-- Portal Perfin — indicadores macroeconômicos (BCB/SGS).

create table public.indicadores (
  codigo text primary key,
  nome text not null,
  unidade text not null,
  -- tipo define a agregação: taxas mensais/diárias são compostas, cotações usam variação,
  -- taxas anuais (Selic meta, CDI a.a.) mostram o nível.
  tipo text not null check (tipo in ('taxa_mensal', 'taxa_diaria', 'taxa_anual', 'cotacao')),
  periodicidade text not null check (periodicidade in ('diaria', 'mensal')),
  serie_sgs integer not null unique,
  casas_decimais smallint not null default 2,
  ativo boolean not null default true
);
alter table public.indicadores enable row level security;
create policy "admin lê indicadores" on public.indicadores
  for select to authenticated using ((select public.eh_admin()));

create table public.indicadores_valores (
  indicador_codigo text not null references public.indicadores (codigo),
  data date not null,
  valor numeric(20, 8) not null,
  atualizado_em timestamptz not null default now(),
  primary key (indicador_codigo, data)
);
create index indicadores_valores_data_idx on public.indicadores_valores (data);
alter table public.indicadores_valores enable row level security;
create policy "admin lê valores" on public.indicadores_valores
  for select to authenticated using ((select public.eh_admin()));

insert into public.indicadores (codigo, nome, unidade, tipo, periodicidade, serie_sgs, casas_decimais) values
  ('IPCA',   'IPCA',                 '% a.m.',  'taxa_mensal', 'mensal', 433,   2),
  ('IPCA15', 'IPCA-15',              '% a.m.',  'taxa_mensal', 'mensal', 7478,  2),
  ('INPC',   'INPC',                 '% a.m.',  'taxa_mensal', 'mensal', 188,   2),
  ('IGPM',   'IGP-M',                '% a.m.',  'taxa_mensal', 'mensal', 189,   2),
  ('POUP',   'Poupança',             '% a.m.',  'taxa_mensal', 'mensal', 195,   4),
  ('SELIC',  'Selic meta',           '% a.a.',  'taxa_anual',  'diaria', 432,   2),
  ('CDI',    'CDI',                  '% a.d.',  'taxa_diaria', 'diaria', 12,    6),
  ('CDI_AA', 'CDI anualizado',       '% a.a.',  'taxa_anual',  'diaria', 4389,  2),
  ('USD',    'Dólar PTAX (venda)',   'R$/US$',  'cotacao',     'diaria', 1,     4),
  ('EUR',    'Euro PTAX (venda)',    'R$/€',    'cotacao',     'diaria', 21619, 4);
