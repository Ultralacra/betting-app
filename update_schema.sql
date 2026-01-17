-- ==============================================================================
-- UPDATE SCHEMA - BetTracker Pro
-- Este script agrega las tablas y columnas necesarias para las nuevas funcionalidades:
-- 1. Notificaciones Push (push_subscriptions)
-- 2. Campos adicionales en Usuarios (display_name, updated_at)
-- 3. Campos adicionales en Logros (created_by, updated_at)
-- ==============================================================================

-- 1. Tabla para Suscripciones de Notificaciones Push
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- RLS para push_subscriptions
alter table public.push_subscriptions enable row level security;

-- Política: Los usuarios pueden ver y gestionar SOLO sus propias suscripciones
create policy "Usuarios gestionan sus propias suscripciones" 
  on public.push_subscriptions 
  for all 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

-- Política: El rol de servicio (Admin) puede ver y gestionar TODAS las suscripciones
-- Esto es necesario para enviar notificaciones a todos los usuarios
create policy "Service role gestiona todas las suscripciones" 
  on public.push_subscriptions 
  for all 
  to service_role 
  using (true) 
  with check (true);


-- 2. Actualización de tabla app_users
-- Agregamos display_name y updated_at si no existen
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'app_users' and column_name = 'display_name') then
    alter table public.app_users add column display_name text;
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'app_users' and column_name = 'updated_at') then
    alter table public.app_users add column updated_at timestamptz default now();
  end if;
end $$;


-- 3. Actualización de tabla achievements
-- Agregamos created_by y updated_at si no existen
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name = 'achievements' and column_name = 'created_by') then
    alter table public.achievements add column created_by uuid references auth.users(id);
  end if;

  if not exists (select 1 from information_schema.columns where table_name = 'achievements' and column_name = 'updated_at') then
    alter table public.achievements add column updated_at timestamptz default now();
  end if;
end $$;

-- Política adicional para achievements (si el admin necesita borrar o actualizar)
-- La política existente "Lectura de logros autenticada" solo permite SELECT.
-- Los endpoints de admin usan service_role, así que RLS no los bloquea, 
-- pero es buena práctica tener políticas explícitas si se planea acceso desde cliente no-admin (que no es el caso actual).


-- 4. Historial de Notificaciones (envíos desde admin)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  url text null,
  sent_count int not null default 0,
  failed_count int not null default 0,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_by_idx on public.notifications(created_by);

alter table public.notifications enable row level security;

-- Solo el rol de servicio y administradores pueden insertar/seleccionar
drop policy if exists "notifications_select_admin" on public.notifications;
create policy "notifications_select_admin" on public.notifications
  for select
  to authenticated
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "notifications_insert_admin" on public.notifications;
create policy "notifications_insert_admin" on public.notifications
  for insert
  to authenticated
  with check (public.is_admin() or auth.role() = 'service_role');

