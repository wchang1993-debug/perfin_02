-- Portal Perfin — base: administradores, credenciais Google, relatórios, coleta e calendário.
-- Todas as tabelas têm RLS ligado. Sem política = acesso negado para anon/authenticated;
-- só o servidor (secret key) e funções security definer as acessam.

-- Administradores: espelho de ADMIN_EMAILS, sincronizado pelo callback de login.
create table public.administradores (
  email text primary key check (email = lower(email)),
  criado_em timestamptz not null default now()
);
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;

-- security definer para que o RLS das demais tabelas consulte administradores
-- sem expor a tabela; search_path vazio evita sequestro de objetos.
create function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores a
    where a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;

-- Refresh token do Google, cifrado (AES-256-GCM) pelo servidor. Nunca lido pelo navegador.
create table public.google_credenciais (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token_cifrado text not null,
  escopos text[] not null default '{}',
  atualizado_em timestamptz not null default now()
);
alter table public.google_credenciais enable row level security;
revoke all on public.google_credenciais from anon, authenticated;

-- Relatórios mensais gerados (Planilha Google).
create table public.relatorios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mes_referencia date not null check (extract(day from mes_referencia) = 1),
  status text not null check (status in ('completo', 'preliminar')),
  planilha_id text not null,
  planilha_url text not null,
  criado_em timestamptz not null default now()
);
create index relatorios_user_mes_idx on public.relatorios (user_id, mes_referencia desc);
alter table public.relatorios enable row level security;
create policy "admin lê os próprios relatórios" on public.relatorios
  for select to authenticated
  using (user_id = (select auth.uid()) and (select public.eh_admin()));
create policy "admin registra os próprios relatórios" on public.relatorios
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.eh_admin()));

-- Log das execuções dos coletores (alimenta o alerta de dados desatualizados).
create table public.execucoes_coleta (
  id bigint generated always as identity primary key,
  fonte text not null,
  data_referencia date,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  status text not null check (status in ('executando', 'sucesso', 'erro', 'ignorada')),
  registros integer not null default 0,
  erro text
);
create index execucoes_coleta_fonte_idx on public.execucoes_coleta (fonte, iniciado_em desc);
alter table public.execucoes_coleta enable row level security;
create policy "admin lê execuções" on public.execucoes_coleta
  for select to authenticated using ((select public.eh_admin()));

-- Feriados nacionais (regra ANBIMA), base da contagem de dias úteis (252).
create table public.feriados (
  data date primary key,
  descricao text not null
);
alter table public.feriados enable row level security;
create policy "admin lê feriados" on public.feriados
  for select to authenticated using ((select public.eh_admin()));

-- Metas de inflação do CMN (centro e tolerância em p.p.).
create table public.metas_inflacao (
  ano integer primary key,
  centro numeric(6, 2) not null,
  tolerancia numeric(6, 2) not null
);
alter table public.metas_inflacao enable row level security;
create policy "admin lê metas" on public.metas_inflacao
  for select to authenticated using ((select public.eh_admin()));

insert into public.metas_inflacao (ano, centro, tolerancia) values
  (2017, 4.50, 1.50), (2018, 4.50, 1.50), (2019, 4.25, 1.50), (2020, 4.00, 1.50),
  (2021, 3.75, 1.50), (2022, 3.50, 1.50), (2023, 3.25, 1.50), (2024, 3.00, 1.50),
  (2025, 3.00, 1.50), (2026, 3.00, 1.50), (2027, 3.00, 1.50), (2028, 3.00, 1.50);
