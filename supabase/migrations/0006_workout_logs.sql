-- Sprint 7.2 — Persistencia cloud de los registros de Entreno (pesos, reps,
-- series hechas) y de las semanas archivadas.
--
-- Hoy viven solo en localStorage (lib/mock/repository.ts):
--   * `forja.session.{routineId}.{weekId}.{dayId}`  -> DaySession (progreso EN VIVO de un día)
--   * `forja.executions.{routineId}.{weekId}`       -> RoutineExecution[] (semanas archivadas)
-- `forja.history` (racha) NO se migra: es derivable de las sesiones.
--
-- Mismo criterio que 0003/0005: `payload jsonb` conserva exactamente las
-- estructuras TypeScript; version para control optimista; auditoría;
-- jamás DELETE físico; RLS decide todo; coach SOLO lectura de alumnos
-- activos; anon sin acceso. Reutiliza public.current_user_role() (0002).
--
--   1. workout_sessions    — una fila por atleta + rutina + semana + día.
--   2. workout_executions  — una fila por ejecución archivada (inmutable en la práctica).
--
-- Columnas como `session_date`/`completed_at`/`execution_number` están
-- desnormalizadas a propósito para poder hacer estadísticas por SQL sin
-- abrir el jsonb.

/* ------------------------------------------------------------------ */
/* 1. workout_sessions                                                 */
/* ------------------------------------------------------------------ */

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id),
  routine_id text not null,
  week_id text not null,
  day_id text not null,
  -- YYYY-MM-DD del primer registro de la sesión (DaySession.date); null si aún sin registros.
  session_date date,
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_sessions_identity_key unique (athlete_id, routine_id, week_id, day_id),
  constraint workout_sessions_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint workout_sessions_ids_not_blank check (
    btrim(routine_id) <> '' and btrim(week_id) <> '' and btrim(day_id) <> ''
  )
);

comment on table public.workout_sessions is
  'Progreso en vivo de un día de rutina (DaySession completo en payload). unique(athlete_id, routine_id, week_id, day_id) es la clave de idempotencia de importación.';

create index workout_sessions_athlete_idx on public.workout_sessions (athlete_id);
create index workout_sessions_athlete_date_idx on public.workout_sessions (athlete_id, session_date);
create index workout_sessions_updated_at_idx on public.workout_sessions (updated_at desc);

/* ------------------------------------------------------------------ */
/* 2. workout_executions                                               */
/* ------------------------------------------------------------------ */

create table public.workout_executions (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id),
  routine_id text not null,
  week_id text not null,
  -- RoutineExecution.id local (ej: exec-{routineId}-{weekId}-{timestamp}); identidad de importación.
  execution_id text not null,
  execution_number integer not null,
  completed_at timestamptz not null,
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_executions_athlete_execution_key unique (athlete_id, execution_id),
  constraint workout_executions_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint workout_executions_number_positive check (execution_number >= 1),
  constraint workout_executions_ids_not_blank check (
    btrim(routine_id) <> '' and btrim(week_id) <> '' and btrim(execution_id) <> ''
  )
);

comment on table public.workout_executions is
  'Semana completada y archivada (RoutineExecution completo en payload). unique(athlete_id, execution_id) es la clave de idempotencia de importación.';

create index workout_executions_athlete_idx on public.workout_executions (athlete_id);
create index workout_executions_athlete_completed_idx on public.workout_executions (athlete_id, completed_at desc);
create index workout_executions_routine_idx on public.workout_executions (athlete_id, routine_id, week_id);

/* ------------------------------------------------------------------ */
/* Triggers de auditoría/versionado                                    */
/* ------------------------------------------------------------------ */

create function public.workout_set_audit_on_insert()
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

create function public.workout_sessions_set_audit_on_update()
returns trigger
language plpgsql
as $$
begin
  -- Identidad inmutable.
  new.athlete_id := old.athlete_id;
  new.routine_id := old.routine_id;
  new.week_id := old.week_id;
  new.day_id := old.day_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create function public.workout_executions_set_audit_on_update()
returns trigger
language plpgsql
as $$
begin
  new.athlete_id := old.athlete_id;
  new.routine_id := old.routine_id;
  new.week_id := old.week_id;
  new.execution_id := old.execution_id;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_by := auth.uid();
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

create trigger workout_sessions_set_audit_on_insert
  before insert on public.workout_sessions
  for each row execute function public.workout_set_audit_on_insert();

create trigger workout_sessions_set_audit_on_update
  before update on public.workout_sessions
  for each row execute function public.workout_sessions_set_audit_on_update();

create trigger workout_executions_set_audit_on_insert
  before insert on public.workout_executions
  for each row execute function public.workout_set_audit_on_insert();

create trigger workout_executions_set_audit_on_update
  before update on public.workout_executions
  for each row execute function public.workout_executions_set_audit_on_update();

/* ------------------------------------------------------------------ */
/* RLS                                                                 */
/* ------------------------------------------------------------------ */

alter table public.workout_sessions enable row level security;
alter table public.workout_executions enable row level security;

-- workout_sessions -------------------------------------------------------

create policy workout_sessions_select_own on public.workout_sessions for select to authenticated
  using (athlete_id = auth.uid());
create policy workout_sessions_insert_own on public.workout_sessions for insert to authenticated
  with check (athlete_id = auth.uid());
create policy workout_sessions_update_own on public.workout_sessions for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Coach: SOLO lectura de alumnos activos.
create policy workout_sessions_select_coach on public.workout_sessions for select to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = workout_sessions.athlete_id
        and cs.active
    )
  );

create policy workout_sessions_select_admin on public.workout_sessions for select to authenticated
  using (public.current_user_role() = 'admin');
create policy workout_sessions_insert_admin on public.workout_sessions for insert to authenticated
  with check (public.current_user_role() = 'admin');
create policy workout_sessions_update_admin on public.workout_sessions for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- workout_executions -----------------------------------------------------

create policy workout_executions_select_own on public.workout_executions for select to authenticated
  using (athlete_id = auth.uid());
create policy workout_executions_insert_own on public.workout_executions for insert to authenticated
  with check (athlete_id = auth.uid());
create policy workout_executions_update_own on public.workout_executions for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

create policy workout_executions_select_coach on public.workout_executions for select to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = workout_executions.athlete_id
        and cs.active
    )
  );

create policy workout_executions_select_admin on public.workout_executions for select to authenticated
  using (public.current_user_role() = 'admin');
create policy workout_executions_insert_admin on public.workout_executions for insert to authenticated
  with check (public.current_user_role() = 'admin');
create policy workout_executions_update_admin on public.workout_executions for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

/* ------------------------------------------------------------------ */
/* Grants explícitos — nunca DELETE.                                    */
/* ------------------------------------------------------------------ */

revoke all on public.workout_sessions from anon;
revoke all on public.workout_sessions from authenticated;
grant select, insert, update on public.workout_sessions to authenticated;

revoke all on public.workout_executions from anon;
revoke all on public.workout_executions from authenticated;
grant select, insert, update on public.workout_executions to authenticated;
