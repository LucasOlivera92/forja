-- Sprint 7.0 — Persistencia cloud de Nutrición.
--
-- Tres superficies de datos, hoy solo en localStorage (lib/mock/repository.ts),
-- pasan a tener su tabla propia en Supabase — separadas porque tienen
-- identidad y cardinalidad distintas, no porque el payload lo exija:
--
--   1. nutrition_profiles      — UN perfil por atleta (NutritionProfile).
--   2. nutrition_weekly_plans  — UNA planificación semanal por atleta
--                                 (WeeklyMealPlan, grilla 7×4).
--   3. nutrition_daily_logs    — UNA fila por atleta POR DÍA, con el
--                                 array completo de comidas completadas
--                                 ese día (MealCompletionLog[] — mismo
--                                 criterio que la key de localStorage
--                                 `forja.nutrition.log.{YYYY-MM-DD}`, que
--                                 ya guarda un array por día).
--
-- Mismo criterio que supabase/migrations/0003_routines.sql en todo lo que
-- aplica: `payload jsonb` para no tener que traducir las estructuras
-- TypeScript actuales a columnas relacionales (acelera la beta, evita un
-- segundo modelo de datos en paralelo); control optimista con `version`;
-- auditoría con `created_by`/`updated_by`/`created_at`/`updated_at`;
-- jamás DELETE físico (sin policy de DELETE, y `authenticated` nunca
-- recibe el grant de `delete`); RLS decide TODO el acceso, este archivo no
-- duplica esa lógica en la aplicación.
--
-- Diferencia deliberada con `routines`: acá no hace falta un `local_id`
-- para idempotencia de importación — perfil y planificación semanal son
-- un singleton real por atleta (no puede haber dos), así que
-- `unique (athlete_id)` alcanza como clave de idempotencia. El registro
-- diario si tiene una segunda coordenada de identidad (la fecha), así que
-- su clave de idempotencia es `unique (athlete_id, log_date)`.
--
-- No toca `routines`, `coach_students`, `profiles` ni ninguna función ya
-- existente (reutiliza `public.current_user_role()`, definida en 0002, tal
-- cual — no se redefine acá).

/* ------------------------------------------------------------------ */
/* 1. nutrition_profiles — un perfil por atleta                        */
/* ------------------------------------------------------------------ */

create table public.nutrition_profiles (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id),
  -- Estructura completa de NutritionProfile (lib/mock/types.ts). Validada
  -- en runtime por lib/cloud/nutrition.ts, nunca asumida acá.
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_profiles_athlete_key unique (athlete_id),
  constraint nutrition_profiles_payload_is_object check (jsonb_typeof(payload) = 'object')
);

comment on table public.nutrition_profiles is
  'Un perfil nutricional por atleta (NutritionProfile completo en payload). unique(athlete_id) es también la clave de idempotencia de importación: si ya existe una fila, no se crea una segunda.';

create index nutrition_profiles_athlete_idx on public.nutrition_profiles (athlete_id);
create index nutrition_profiles_updated_at_idx on public.nutrition_profiles (updated_at desc);

/* ------------------------------------------------------------------ */
/* 2. nutrition_weekly_plans — una planificación semanal por atleta    */
/* ------------------------------------------------------------------ */

create table public.nutrition_weekly_plans (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id),
  -- Estructura completa de WeeklyMealPlan (grilla 7 días × 4 comidas de
  -- ids de MealTemplate, o null). Validada en runtime, nunca asumida acá.
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_weekly_plans_athlete_key unique (athlete_id),
  constraint nutrition_weekly_plans_payload_is_object check (jsonb_typeof(payload) = 'object')
);

comment on table public.nutrition_weekly_plans is
  'Una planificación semanal por atleta (WeeklyMealPlan completo en payload). unique(athlete_id) es también la clave de idempotencia de importación.';

create index nutrition_weekly_plans_athlete_idx on public.nutrition_weekly_plans (athlete_id);
create index nutrition_weekly_plans_updated_at_idx on public.nutrition_weekly_plans (updated_at desc);

/* ------------------------------------------------------------------ */
/* 3. nutrition_daily_logs — un registro por atleta por día             */
/* ------------------------------------------------------------------ */

create table public.nutrition_daily_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id),
  -- YYYY-MM-DD del día que este registro representa — misma fecha que la
  -- key de localStorage `forja.nutrition.log.{log_date}`. Inmutable tras
  -- crear la fila (ver trigger de update): identifica, junto a
  -- athlete_id, cuál día es este registro.
  log_date date not null,
  -- Array completo de MealCompletionLog de ese día (lib/mock/types.ts),
  -- tal cual vive hoy en localStorage. Validado en runtime, nunca
  -- asumido acá.
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_daily_logs_athlete_date_key unique (athlete_id, log_date),
  constraint nutrition_daily_logs_payload_is_array check (jsonb_typeof(payload) = 'array')
);

comment on table public.nutrition_daily_logs is
  'Un registro por atleta por día, con el array completo de comidas completadas ese día en payload. unique(athlete_id, log_date) es también la clave de idempotencia de importación.';

create index nutrition_daily_logs_athlete_idx on public.nutrition_daily_logs (athlete_id);
create index nutrition_daily_logs_log_date_idx on public.nutrition_daily_logs (log_date);
create index nutrition_daily_logs_updated_at_idx on public.nutrition_daily_logs (updated_at desc);

/* ------------------------------------------------------------------ */
/* Triggers de auditoría/versionado                                    */
/* ------------------------------------------------------------------ */

-- Compartido por nutrition_profiles y nutrition_weekly_plans: mismas
-- columnas de auditoría exactas en ambas tablas (id, athlete_id, payload,
-- created_by, updated_by, version, created_at, updated_at) — no hace
-- falta un trigger separado por tabla para esta parte.

create function public.nutrition_owned_set_audit_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.version := 1;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create function public.nutrition_owned_set_audit_on_update()
returns trigger
language plpgsql
as $$
begin
  -- Identidad inmutable: nunca se reasigna el dueño de la fila ni cuándo
  -- se creó, sin importar qué mande el cliente en el UPDATE.
  new.athlete_id := old.athlete_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger nutrition_profiles_set_audit_on_insert
  before insert on public.nutrition_profiles
  for each row execute function public.nutrition_owned_set_audit_on_insert();

create trigger nutrition_profiles_set_audit_on_update
  before update on public.nutrition_profiles
  for each row execute function public.nutrition_owned_set_audit_on_update();

create trigger nutrition_weekly_plans_set_audit_on_insert
  before insert on public.nutrition_weekly_plans
  for each row execute function public.nutrition_owned_set_audit_on_insert();

create trigger nutrition_weekly_plans_set_audit_on_update
  before update on public.nutrition_weekly_plans
  for each row execute function public.nutrition_owned_set_audit_on_update();

-- nutrition_daily_logs necesita su propia versión: además de lo de arriba,
-- `log_date` también es identidad inmutable (junto a athlete_id, es la
-- clave de `nutrition_daily_logs_athlete_date_key`).

create function public.nutrition_daily_logs_set_audit_on_insert()
returns trigger
language plpgsql
as $$
begin
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.version := 1;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create function public.nutrition_daily_logs_set_audit_on_update()
returns trigger
language plpgsql
as $$
begin
  new.athlete_id := old.athlete_id;
  new.log_date := old.log_date;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger nutrition_daily_logs_set_audit_on_insert
  before insert on public.nutrition_daily_logs
  for each row execute function public.nutrition_daily_logs_set_audit_on_insert();

create trigger nutrition_daily_logs_set_audit_on_update
  before update on public.nutrition_daily_logs
  for each row execute function public.nutrition_daily_logs_set_audit_on_update();

/* ------------------------------------------------------------------ */
/* RLS — mismo criterio que 0003_routines.sql, reutilizando            */
/* public.current_user_role() (definida en 0002, no se redefine acá)   */
/* ------------------------------------------------------------------ */

alter table public.nutrition_profiles enable row level security;
alter table public.nutrition_weekly_plans enable row level security;
alter table public.nutrition_daily_logs enable row level security;

-- nutrition_profiles ---------------------------------------------------

create policy nutrition_profiles_select_own
  on public.nutrition_profiles for select
  to authenticated
  using (athlete_id = auth.uid());

create policy nutrition_profiles_insert_own
  on public.nutrition_profiles for insert
  to authenticated
  with check (athlete_id = auth.uid());

create policy nutrition_profiles_update_own
  on public.nutrition_profiles for update
  to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- Coach: SOLO lectura de sus alumnos activos — todavía no puede modificar
-- la nutrición del alumno (Sprint 7.0, explícito).
create policy nutrition_profiles_select_coach
  on public.nutrition_profiles for select
  to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = nutrition_profiles.athlete_id
        and cs.active
    )
  );

create policy nutrition_profiles_select_admin
  on public.nutrition_profiles for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy nutrition_profiles_insert_admin
  on public.nutrition_profiles for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

create policy nutrition_profiles_update_admin
  on public.nutrition_profiles for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- nutrition_weekly_plans ------------------------------------------------

create policy nutrition_weekly_plans_select_own
  on public.nutrition_weekly_plans for select
  to authenticated
  using (athlete_id = auth.uid());

create policy nutrition_weekly_plans_insert_own
  on public.nutrition_weekly_plans for insert
  to authenticated
  with check (athlete_id = auth.uid());

create policy nutrition_weekly_plans_update_own
  on public.nutrition_weekly_plans for update
  to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy nutrition_weekly_plans_select_coach
  on public.nutrition_weekly_plans for select
  to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = nutrition_weekly_plans.athlete_id
        and cs.active
    )
  );

create policy nutrition_weekly_plans_select_admin
  on public.nutrition_weekly_plans for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy nutrition_weekly_plans_insert_admin
  on public.nutrition_weekly_plans for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

create policy nutrition_weekly_plans_update_admin
  on public.nutrition_weekly_plans for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- nutrition_daily_logs ----------------------------------------------------

create policy nutrition_daily_logs_select_own
  on public.nutrition_daily_logs for select
  to authenticated
  using (athlete_id = auth.uid());

create policy nutrition_daily_logs_insert_own
  on public.nutrition_daily_logs for insert
  to authenticated
  with check (athlete_id = auth.uid());

create policy nutrition_daily_logs_update_own
  on public.nutrition_daily_logs for update
  to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy nutrition_daily_logs_select_coach
  on public.nutrition_daily_logs for select
  to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = nutrition_daily_logs.athlete_id
        and cs.active
    )
  );

create policy nutrition_daily_logs_select_admin
  on public.nutrition_daily_logs for select
  to authenticated
  using (public.current_user_role() = 'admin');

create policy nutrition_daily_logs_insert_admin
  on public.nutrition_daily_logs for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

create policy nutrition_daily_logs_update_admin
  on public.nutrition_daily_logs for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

/* ------------------------------------------------------------------ */
/* Grants explícitos — defensa en profundidad además de RLS.            */
/* Nunca DELETE: ni siquiera admin lo recibe acá.                       */
/* ------------------------------------------------------------------ */

revoke all on public.nutrition_profiles from anon;
revoke all on public.nutrition_profiles from authenticated;
grant select, insert, update on public.nutrition_profiles to authenticated;

revoke all on public.nutrition_weekly_plans from anon;
revoke all on public.nutrition_weekly_plans from authenticated;
grant select, insert, update on public.nutrition_weekly_plans to authenticated;

revoke all on public.nutrition_daily_logs from anon;
revoke all on public.nutrition_daily_logs from authenticated;
grant select, insert, update on public.nutrition_daily_logs to authenticated;
