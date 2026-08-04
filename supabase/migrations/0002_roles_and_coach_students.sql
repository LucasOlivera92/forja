-- FORJA — Migración 0002
-- Sprint 6.0: fundación multiusuario (roles + relación coach→alumno).
--
-- Esta migración es INCREMENTAL y NO destructiva sobre 0001_profiles.sql:
-- no borra ni reescribe ninguna columna, tabla ni policy existente. Solo
-- agrega columnas nuevas, una tabla nueva, y policies/funciones nuevas.
--
-- Requiere que 0001_profiles.sql ya haya sido ejecutada (la tabla
-- `public.profiles` debe existir).
--
-- Orden corregido tras el error 42P01 (la policy de profiles que consulta
-- `coach_students` se creaba antes de que esa tabla existiera). Ahora:
-- A) profiles: role + avatar_url
-- B) funciones (current_user_role, prevent_role_self_escalation) + trigger
-- C) coach_students completa (constraints + índice)
-- D) RLS en coach_students
-- E) policies de profiles que consultan coach_students
-- F) policies de coach_students
--
-- Idempotente: se puede volver a correr entera sin error aunque ya existan
-- role, avatar_url, profiles_role_check, prevent_role_self_escalation,
-- profiles_prevent_role_escalation o current_user_role de una corrida
-- parcial anterior. No borra perfiles ni usuarios de auth.users.

-- ============================================================
-- A) profiles: agregar role + avatar_url (no destructivo)
-- ============================================================

alter table public.profiles
  add column if not exists role text not null default 'student',
  add column if not exists avatar_url text;

-- Validación de valores permitidos. Se usa CHECK en vez de un tipo enum de
-- Postgres a propósito: agregar un valor nuevo a un enum requiere un paso
-- de migración especial (ALTER TYPE ... ADD VALUE no se puede revertir
-- dentro de la misma transacción); con CHECK, sumar un rol nuevo el día de
-- mañana es una migración chica y directa (DROP CONSTRAINT + ADD CONSTRAINT).
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'coach', 'student'));

-- ============================================================
-- B) Funciones + trigger (no dependen de coach_students)
-- ============================================================

-- --------------------------------------------------------------
-- Protección de `role`: ningún usuario puede cambiar su propio rol
-- --------------------------------------------------------------
-- La policy de UPDATE de 0001 ("usuarios actualizan su propio perfil") ya
-- permite que cada usuario actualice su fila — eso incluye, sin esta
-- protección, la columna `role`. RLS por sí solo no puede comparar el
-- valor viejo contra el nuevo de forma simple en una policy, así que la
-- protección real va en un trigger BEFORE UPDATE: si `role` cambia y quien
-- ejecuta el UPDATE no es la service_role key (identificable por el claim
-- "role" = "service_role" del JWT que usa esa key), el trigger revierte el
-- cambio al valor anterior en silencio. Esto deja la puerta preparada para
-- un panel de administración futuro que use la service_role del lado del
-- servidor (nunca en el navegador) para promover a un usuario a coach/admin.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;

create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- --------------------------------------------------------------
-- Helper: rol del usuario autenticado actual
-- --------------------------------------------------------------
-- security definer evita el problema clásico de recursión infinita al
-- referenciar `profiles` desde dentro de una policy de la propia tabla
-- `profiles` (una policy que hace "select role from profiles where id =
-- auth.uid()" directamente dispara de nuevo esa misma policy). Al marcar
-- la función como security definer, la consulta interna corre sin RLS.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ============================================================
-- C) coach_students (tabla completa, antes de cualquier policy que la use)
-- ============================================================

create table if not exists public.coach_students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),

  -- Un usuario no puede ser su propio coach.
  constraint coach_students_no_self_coach check (coach_id <> student_id),

  -- No permitir dos filas idénticas coach+alumno (evita relaciones duplicadas).
  constraint coach_students_unique_pair unique (coach_id, student_id)
);

-- Un alumno tiene, a lo sumo, UN coach activo a la vez ("coach principal").
-- Esto no impide guardar historial: una fila vieja puede quedar con
-- active = false y crearse una fila nueva con otro coach. Si en el futuro
-- FORJA necesita que un alumno tenga varios coaches simultáneos, este
-- índice parcial es lo primero que hay que sacar.
drop index if exists coach_students_one_active_coach_per_student;
create unique index coach_students_one_active_coach_per_student
  on public.coach_students (student_id)
  where active;

-- ============================================================
-- D) RLS en coach_students
-- ============================================================

alter table public.coach_students enable row level security;

-- ============================================================
-- E) Policies de profiles que consultan coach_students
--    (recién ahora, con la tabla ya creada)
-- ============================================================

-- Coach: puede leer los perfiles de sus alumnos activos (no todos).
drop policy if exists "coach ve perfiles de sus alumnos activos" on public.profiles;
create policy "coach ve perfiles de sus alumnos activos"
  on public.profiles for select
  using (
    exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = profiles.id
        and cs.active
    )
  );

-- Admin: puede leer todos los perfiles.
drop policy if exists "admin ve todos los perfiles" on public.profiles;
create policy "admin ve todos los perfiles"
  on public.profiles for select
  using (public.current_user_role() = 'admin');

-- Nota: no se agrega ninguna policy de UPDATE nueva. Un coach o un admin
-- NO pueden modificar el perfil de otro usuario mediante la API — solo
-- existe la policy de 0001 ("auth.uid() = id"), así que "el coach no puede
-- modificar el role de ningún usuario" se cumple porque no tiene ningún
-- permiso de escritura sobre perfiles ajenos, ni siquiera el suyo propio
-- vía coach_students.

-- ============================================================
-- F) Policies de coach_students
-- ============================================================

-- Coach: ve sus propias relaciones (para saber quiénes son sus alumnos).
drop policy if exists "coach ve sus propias relaciones" on public.coach_students;
create policy "coach ve sus propias relaciones"
  on public.coach_students for select
  using (coach_id = auth.uid());

-- Alumno: ve su propia relación (para saber quién es su coach).
drop policy if exists "alumno ve su propia relacion" on public.coach_students;
create policy "alumno ve su propia relacion"
  on public.coach_students for select
  using (student_id = auth.uid());

-- Admin: ve todas las relaciones.
drop policy if exists "admin ve todas las relaciones coach_students" on public.coach_students;
create policy "admin ve todas las relaciones coach_students"
  on public.coach_students for select
  using (public.current_user_role() = 'admin');

-- IMPORTANTE: a propósito, esta migración NO crea ninguna policy de INSERT,
-- UPDATE ni DELETE sobre coach_students. Sin una policy explícita para un
-- comando, RLS deniega ese comando por defecto para cualquier cliente que
-- use la anon/publishable key (aunque esté autenticado). Esto significa
-- que, hoy, nadie puede crear/editar/borrar relaciones coach-alumno desde
-- el navegador — ni siquiera un admin. Es intencional: todavía no existe
-- un panel de administración (Sprint 6.0 solo deja la base preparada). La
-- gestión de estas relaciones, cuando se construya, deberá hacerse desde
-- una Server Action o Route Handler que use la service_role key del lado
-- del servidor (nunca expuesta al navegador), o agregando una policy de
-- INSERT/UPDATE restringida a `current_user_role() = 'admin'` en una
-- migración futura, cuando se construya ese panel.
