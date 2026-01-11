-- Ejecuta este SQL en Supabase (SQL Editor) para crear las tablas y políticas.
-- Requiere extensión pgcrypto (para gen_random_uuid).

create extension if not exists pgcrypto;

-- Helper: determinar si el usuario actual es admin (por public.app_users.role)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_users u
    where u.user_id = auth.uid()
      and u.role = 'ADMIN'
  );
$$;

-- Perfil/membresía por usuario (fuente de verdad para FREE/PRO)
create table if not exists public.app_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text null,
  display_name text null,
  role text not null default 'MEMBER' check (role in ('ADMIN','MEMBER')),
  membership_tier text not null default 'FREE' check (membership_tier in ('FREE','PRO')),
  membership_duration text null check (membership_duration in ('1M','2M','3M','1Y','LIFETIME')),
  membership_expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_set_updated_at on public.app_users;
create trigger app_users_set_updated_at
before update on public.app_users
for each row
execute procedure public.set_updated_at();

alter table public.app_users enable row level security;

drop policy if exists "app_users_select_own" on public.app_users;
create policy "app_users_select_own" on public.app_users
  for select
  using (auth.uid() = user_id);

drop policy if exists "app_users_insert_own" on public.app_users;
create policy "app_users_insert_own" on public.app_users
  for insert
  with check (auth.uid() = user_id);

-- Seed/upgrade del usuario admin (usa tu UID)
insert into public.app_users (user_id, role, membership_tier)
values ('58d4c980-33e7-4b83-a531-1a41671e9e7b', 'ADMIN', 'PRO')
on conflict (user_id)
do update set role = excluded.role;

-- Habilitar Realtime para app_users (si existe la publicación)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'app_users'
    ) then
      execute 'alter publication supabase_realtime add table public.app_users';
    end if;
  end if;
end;
$$;

-- Logros (achievements) - solo admin puede crear/editar/borrar
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  -- Logro de parley
  parley_name text not null,
  line text not null,
  momio text not null,
  -- Estado del logro: pendiente / pegó / no pegó
  result text not null default 'PENDING' check (result in ('PENDING','HIT','MISS')),
  -- Compat/backward (si ya existía tabla vieja)
  title text null,
  description text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migración: si la tabla ya existía con columnas viejas, añadimos las nuevas.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'achievements'
  ) then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = 'achievements' and column_name = 'parley_name'
    ) then
      execute 'alter table public.achievements add column parley_name text';
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = 'achievements' and column_name = 'line'
    ) then
      execute 'alter table public.achievements add column line text';
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = 'achievements' and column_name = 'momio'
    ) then
      execute 'alter table public.achievements add column momio text';
    end if;

    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public' and table_name = 'achievements' and column_name = 'result'
    ) then
      execute 'alter table public.achievements add column result text';
      execute 'alter table public.achievements alter column result set default ''PENDING''';
      execute 'update public.achievements set result = ''PENDING'' where result is null';
      execute 'alter table public.achievements alter column result set not null';
      execute 'alter table public.achievements add constraint achievements_result_check check (result in (''PENDING'',''HIT'',''MISS''))';
    end if;

    -- Backfill defensivo si había filas sin estado
    execute 'update public.achievements set result = ''PENDING'' where result is null';
  end if;
end;
$$;

-- Configuración: límites diarios de logros por plan (FREE/PRO)
create table if not exists public.achievement_settings (
  id int primary key default 1,
  free_daily_limit int not null default 1,
  pro_daily_limit int not null default 3,
  updated_at timestamptz not null default now(),
  constraint achievement_settings_singleton check (id = 1),
  constraint achievement_settings_free_limit check (free_daily_limit >= 0 and free_daily_limit <= 100),
  constraint achievement_settings_pro_limit check (pro_daily_limit >= 0 and pro_daily_limit <= 100)
);

-- Seed (no sobreescribe si ya existe)
insert into public.achievement_settings (id, free_daily_limit, pro_daily_limit)
values (1, 1, 3)
on conflict (id) do nothing;

drop trigger if exists achievement_settings_set_updated_at on public.achievement_settings;
create trigger achievement_settings_set_updated_at
before update on public.achievement_settings
for each row
execute procedure public.set_updated_at();

alter table public.achievement_settings enable row level security;

drop policy if exists "achievement_settings_select_authenticated" on public.achievement_settings;
create policy "achievement_settings_select_authenticated" on public.achievement_settings
  for select
  to authenticated
  using (true);

drop policy if exists "achievement_settings_insert_admin" on public.achievement_settings;
create policy "achievement_settings_insert_admin" on public.achievement_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "achievement_settings_update_admin" on public.achievement_settings;
create policy "achievement_settings_update_admin" on public.achievement_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "achievement_settings_delete_admin" on public.achievement_settings;
create policy "achievement_settings_delete_admin" on public.achievement_settings
  for delete
  to authenticated
  using (public.is_admin());

-- Configuración: límites de planes guardados por plan (FREE/PRO)
create table if not exists public.plan_settings (
  id int primary key default 1,
  free_max_saved_plans int not null default 2,
  -- null = ilimitado
  pro_max_saved_plans int null,
  updated_at timestamptz not null default now(),
  constraint plan_settings_singleton check (id = 1),
  constraint plan_settings_free_limit check (free_max_saved_plans >= 0 and free_max_saved_plans <= 1000),
  constraint plan_settings_pro_limit check (pro_max_saved_plans is null or (pro_max_saved_plans >= 0 and pro_max_saved_plans <= 1000))
);

insert into public.plan_settings (id, free_max_saved_plans, pro_max_saved_plans)
values (1, 2, null)
on conflict (id) do nothing;

drop trigger if exists plan_settings_set_updated_at on public.plan_settings;
create trigger plan_settings_set_updated_at
before update on public.plan_settings
for each row
execute procedure public.set_updated_at();

alter table public.plan_settings enable row level security;

drop policy if exists "plan_settings_select_authenticated" on public.plan_settings;
create policy "plan_settings_select_authenticated" on public.plan_settings
  for select
  to authenticated
  using (true);

drop policy if exists "plan_settings_insert_admin" on public.plan_settings;
create policy "plan_settings_insert_admin" on public.plan_settings
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "plan_settings_update_admin" on public.plan_settings;
create policy "plan_settings_update_admin" on public.plan_settings
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "plan_settings_delete_admin" on public.plan_settings;
create policy "plan_settings_delete_admin" on public.plan_settings
  for delete
  to authenticated
  using (public.is_admin());

drop trigger if exists achievements_set_updated_at on public.achievements;
create trigger achievements_set_updated_at
before update on public.achievements
for each row
execute procedure public.set_updated_at();

alter table public.achievements enable row level security;

drop policy if exists "achievements_select_authenticated" on public.achievements;
create policy "achievements_select_authenticated" on public.achievements
  for select
  to authenticated
  using (true);

drop policy if exists "achievements_insert_admin" on public.achievements;
create policy "achievements_insert_admin" on public.achievements
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "achievements_update_admin" on public.achievements;
create policy "achievements_update_admin" on public.achievements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "achievements_delete_admin" on public.achievements;
create policy "achievements_delete_admin" on public.achievements
  for delete
  to authenticated
  using (public.is_admin());

-- Habilitar Realtime para achievements (si existe la publicación)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'achievements'
    ) then
      execute 'alter publication supabase_realtime add table public.achievements';
    end if;
  end if;
end;
$$;

-- Estado actual del usuario (config + plan actual + balance + tema)
create table if not exists public.betting_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb null,
  plan jsonb null,
  current_balance numeric null,
  theme text null,
  updated_at timestamptz not null default now()
);

alter table public.betting_state enable row level security;

drop policy if exists "betting_state_select_own" on public.betting_state;
create policy "betting_state_select_own" on public.betting_state
  for select
  using (auth.uid() = user_id);

drop policy if exists "betting_state_insert_own" on public.betting_state;
create policy "betting_state_insert_own" on public.betting_state
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "betting_state_update_own" on public.betting_state;
create policy "betting_state_update_own" on public.betting_state
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Planes guardados por usuario
create table if not exists public.saved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  config jsonb not null,
  plan jsonb not null,
  saved_at timestamptz not null default now()
);

create index if not exists saved_plans_user_id_idx on public.saved_plans(user_id);

alter table public.saved_plans enable row level security;

drop policy if exists "saved_plans_select_own" on public.saved_plans;
create policy "saved_plans_select_own" on public.saved_plans
  for select
  using (auth.uid() = user_id);

drop policy if exists "saved_plans_insert_own" on public.saved_plans;
create policy "saved_plans_insert_own" on public.saved_plans
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_plans_update_own" on public.saved_plans;
create policy "saved_plans_update_own" on public.saved_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "saved_plans_delete_own" on public.saved_plans;
create policy "saved_plans_delete_own" on public.saved_plans
  for delete
  using (auth.uid() = user_id);
