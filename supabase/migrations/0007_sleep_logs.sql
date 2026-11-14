-- Sprint 8.0 — Persistencia cloud de Descanso (registro de sueño por noche).
--
-- Hoy vive en localStorage (`forja.sleep.log.{YYYY-MM-DD}` -> SleepLog). Mismo
-- criterio que 0005/0006: payload jsonb, version para control optimista,
-- auditoría, jamás DELETE físico, RLS decide todo, coach SOLO lectura de
-- alumnos activos, anon sin acceso. Reutiliza public.current_user_role() (0002).
--
-- Una fila por atleta por noche (`log_date` = día en que se despertó).
-- `hours` y `quality` están desnormalizadas para estadísticas por SQL.

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id),
  log_date date not null,
  hours numeric(4,2) not null,
  quality text not null,
  payload jsonb not null,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sleep_logs_athlete_date_key unique (athlete_id, log_date),
  constraint sleep_logs_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint sleep_logs_hours_range check (hours > 0 and hours <= 24),
  constraint sleep_logs_quality_check check (quality in ('mal', 'regular', 'bien'))
);

comment on table public.sleep_logs is
  'Una noche de sueño por atleta (SleepLog completo en payload). unique(athlete_id, log_date) es la clave de idempotencia de importación.';

create index sleep_logs_athlete_idx on public.sleep_logs (athlete_id);
create index sleep_logs_athlete_date_idx on public.sleep_logs (athlete_id, log_date desc);
create index sleep_logs_updated_at_idx on public.sleep_logs (updated_at desc);

create function public.sleep_logs_set_audit_on_insert()
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

create function public.sleep_logs_set_audit_on_update()
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

create trigger sleep_logs_set_audit_on_insert
  before insert on public.sleep_logs
  for each row execute function public.sleep_logs_set_audit_on_insert();

create trigger sleep_logs_set_audit_on_update
  before update on public.sleep_logs
  for each row execute function public.sleep_logs_set_audit_on_update();

alter table public.sleep_logs enable row level security;

create policy sleep_logs_select_own on public.sleep_logs for select to authenticated
  using (athlete_id = auth.uid());
create policy sleep_logs_insert_own on public.sleep_logs for insert to authenticated
  with check (athlete_id = auth.uid());
create policy sleep_logs_update_own on public.sleep_logs for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());

-- Coach: SOLO lectura de alumnos activos.
create policy sleep_logs_select_coach on public.sleep_logs for select to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = sleep_logs.athlete_id
        and cs.active
    )
  );

create policy sleep_logs_select_admin on public.sleep_logs for select to authenticated
  using (public.current_user_role() = 'admin');
create policy sleep_logs_insert_admin on public.sleep_logs for insert to authenticated
  with check (public.current_user_role() = 'admin');
create policy sleep_logs_update_admin on public.sleep_logs for update to authenticated
  using (public.current_user_role() = 'admin') with check (public.current_user_role() = 'admin');

-- Grants explícitos — nunca DELETE.
revoke all on public.sleep_logs from anon;
revoke all on public.sleep_logs from authenticated;
grant select, insert, update on public.sleep_logs to authenticated;
