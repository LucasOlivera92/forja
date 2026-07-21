-- FORJA — Migración 0001
-- Extensión 1:1 de cada usuario autenticado (Paso 6, sección 1)

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  birth_date date,
  height_cm numeric(5,2),
  primary_goal text, -- 'bajar_grasa' | 'ganar_musculo' | 'recomposicion' | 'mantener'
  timezone text default 'America/Argentina/Buenos_Aires',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuarios crean su propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);
