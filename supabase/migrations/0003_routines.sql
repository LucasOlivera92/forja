-- FORJA — Migración 0003
-- Sprint 6.5 (fase 1 de persistencia): primera tabla real de datos de
-- producto — rutinas del alumno. Depende de 0001_profiles.sql (tabla
-- `public.profiles`) y 0002_roles_and_coach_students.sql (`role`,
-- `public.coach_students`, `public.current_user_role()`). No modifica
-- ninguna de las dos.
--
-- Decisión de arquitectura de esta fase: la estructura completa de una
-- rutina (semanas → días → ejercicios, hoy modelada en TypeScript como
-- `Routine` en lib/mock/types.ts) se guarda ENTERA como un único
-- `payload jsonb` por fila, en vez de normalizarse en tablas separadas de
-- semanas/días/ejercicios. Es deliberado para esta beta de 5 entrenadores:
-- la app hoy siempre lee/escribe la rutina como un objeto completo (nunca
-- una semana o un día sueltos), así que jsonb evita 3 tablas y varios
-- JOINs sin perder nada — se puede normalizar más adelante si hace falta
-- consultar por dentro de la estructura.
--
-- Propiedad y edición compartida: la rutina siempre pertenece al alumno
-- (`athlete_id`), pero tanto el alumno como su entrenador vinculado
-- (`coach_students`, activo, Y con `profiles.role = 'coach'`) pueden
-- crearla y editarla — ninguno de los dos "es dueño" de la edición, solo
-- el alumno es dueño del dato. `created_by`/`updated_by` registran quién
-- hizo cada cosa sin cambiar de quién es la rutina.
--
-- Integridad ante borrado de perfiles (revisión post-review): a propósito,
-- NO se usa `on delete cascade` en `athlete_id`. Borrar el perfil de un
-- alumno queda BLOQUEADO por la base mientras ese alumno tenga alguna fila
-- en `routines` — el borrado real de un alumno (con exportación previa de
-- sus datos) tiene que ser un procedimiento explícito aparte, nunca un
-- efecto secundario accidental de borrar una fila de `profiles`. En
-- cambio, `created_by`/`updated_by` sí usan `on delete set null`: son solo
-- metadata de "quién tocó esto" (un coach o un admin, no el dueño del
-- dato), así que si esa cuenta se borra más adelante, la rutina del
-- alumno tiene que sobrevivir igual — el autor histórico simplemente
-- queda en NULL ("cuenta eliminada"), sin bloquear nada ni borrar nada.
--
-- Versionado (concurrencia optimista): `version` se incrementa en cada
-- UPDATE (ver trigger más abajo). El cliente debe actualizar con
-- `UPDATE ... WHERE id = :id AND version = :versionYaLeida` — si la fila
-- cambió entretanto (coach y alumno editando a la vez), el UPDATE afecta
-- 0 filas y el cliente detecta el conflicto sin necesidad de locks ni
-- columnas extra.
--
-- Borrado lógico: esta fase no expone DELETE a nadie (ni siquiera admin),
-- ni por RLS ni por GRANT (ver sección de permisos al final). No existe
-- ningún camino desde la aplicación para borrar físicamente una fila de
-- `routines` — "eliminar" una rutina es siempre un UPDATE que fija
-- `archived_at`; el dato nunca se pierde de verdad durante la beta.

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),

  -- Dueño real del dato. Sin `on delete cascade` a propósito (ver nota de
  -- integridad arriba): mientras el alumno tenga rutinas, su perfil no se
  -- puede borrar — la base fuerza a exportar/reasignar/borrar las rutinas
  -- primero, con un procedimiento explícito.
  athlete_id uuid not null references public.profiles(id),

  -- Id local (el `Routine.id` que ya genera hoy lib/mock/repository.ts,
  -- ej. "routine-custom-...") — permite importar los datos de
  -- localStorage sin duplicar si el import se reintenta (ver la
  -- restricción única de abajo). No puede quedar vacío ni ser solo
  -- espacios (ver check al final de la tabla).
  local_id text not null,

  -- Estructura completa de la rutina (nombre, semanas, días, ejercicios),
  -- misma forma que `Routine` en lib/mock/types.ts. Sin tablas hijas en
  -- esta fase — ver decisión de arquitectura arriba.
  payload jsonb not null,

  -- Auditoría de edición compartida (alumno y coach pueden escribir la
  -- misma fila): quién la creó nunca cambia una vez insertada la fila;
  -- quién la tocó por última vez sí, en cada UPDATE. Ambos los fuerza un
  -- trigger — nunca el cliente. Nullable + `on delete set null`: son
  -- metadata de autoría, no de propiedad — si la cuenta del coach/admin
  -- que las generó se borra más adelante, la rutina del alumno no debe
  -- borrarse ni bloquear ese borrado; el autor histórico queda en NULL.
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,

  -- Control de concurrencia optimista (ver comentario de versionado arriba).
  version bigint not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Borrado lógico: NULL = activa. Con fecha = archivada. No existe
  -- ningún camino de borrado físico desde la aplicación (ver RLS y GRANTs
  -- al final del archivo).
  archived_at timestamptz null,

  -- Mismo local_id no puede repetirse dos veces para el mismo alumno —
  -- hace que importar desde localStorage sea idempotente (reintentable
  -- sin crear filas duplicadas).
  constraint routines_athlete_local_id_key unique (athlete_id, local_id),

  -- El payload siempre tiene que ser un objeto JSON (no un array, número,
  -- string o el `null` de JSON) — misma forma que `Routine` en TypeScript.
  constraint routines_payload_is_object_check check (jsonb_typeof(payload) = 'object'),

  -- local_id no puede quedar vacío ni ser solo espacios en blanco —
  -- rompería silenciosamente la idempotencia de la importación.
  constraint routines_local_id_not_blank_check check (btrim(local_id) <> '')
);

comment on table public.routines is
  'Rutinas del alumno (Sprint 6.5, fase 1). Estructura completa en payload jsonb — sin tablas hijas de semanas/días/ejercicios en esta fase. athlete_id no tiene on delete cascade (borrar un perfil con rutinas queda bloqueado hasta un procedimiento explícito); created_by/updated_by sí tienen on delete set null (el autor histórico puede quedar NULL sin afectar el dato del alumno). Sin DELETE físico desde la aplicación: el borrado es lógico vía archived_at.';

-- ============================================================
-- Índices
-- ============================================================

-- Rutinas de un alumno — lo que consulta el alumno, y lo que cruzan las
-- policies de coach/admin contra coach_students.
create index if not exists routines_athlete_id_idx
  on public.routines (athlete_id);

-- Orden por "última modificación" — listados y futura sincronización.
create index if not exists routines_updated_at_idx
  on public.routines (updated_at desc);

-- La consulta más común de la app: rutinas de UN alumno que no están
-- archivadas. Índice parcial — no indexa las archivadas, que rara vez se
-- listan.
create index if not exists routines_athlete_active_idx
  on public.routines (athlete_id)
  where archived_at is null;

-- ============================================================
-- Triggers — campos automáticos (nunca los decide el cliente)
-- ============================================================
-- No usan `security definer`: solo leen/escriben la fila NEW/OLD que el
-- propio INSERT/UPDATE ya tiene visible bajo RLS — no hace falta elevar
-- privilegios para eso.

create or replace function public.routines_set_audit_on_insert()
returns trigger
language plpgsql
as $$
begin
  -- created_by/updated_by siempre son quien hace el INSERT, sin importar
  -- qué haya mandado el cliente en esas columnas.
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  -- Toda rutina nueva arranca en version 1, para que el control optimista
  -- de UPDATE (WHERE id = ... AND version = ...) sea confiable desde el
  -- primer momento, sin importar qué version haya mandado el cliente.
  new.version := 1;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists routines_set_audit_on_insert on public.routines;
create trigger routines_set_audit_on_insert
  before insert on public.routines
  for each row execute function public.routines_set_audit_on_insert();

create or replace function public.routines_set_audit_on_update()
returns trigger
language plpgsql
as $$
begin
  -- Inmutables después del INSERT — ni el alumno ni el coach los pueden
  -- cambiar en un UPDATE, sin importar qué manden:
  --   - athlete_id: de quién es la rutina.
  --   - created_by: quién la creó originalmente.
  --   - local_id: el id de importación/idempotencia.
  --   - created_at: el momento real de creación.
  new.athlete_id := old.athlete_id;
  new.created_by := old.created_by;
  new.local_id := old.local_id;
  new.created_at := old.created_at;

  -- updated_by siempre es quien hace el UPDATE.
  new.updated_by := auth.uid();

  -- Versionado optimista: cada UPDATE incrementa version en 1. El cliente
  -- filtra su UPDATE por `id` + la última `version` que leyó; si otro
  -- (coach o alumno) ya actualizó la fila mientras tanto, esa version ya
  -- no coincide y el UPDATE afecta 0 filas — así se detecta la edición
  -- simultánea sin locks.
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists routines_set_audit_on_update on public.routines;
create trigger routines_set_audit_on_update
  before update on public.routines
  for each row execute function public.routines_set_audit_on_update();

-- ============================================================
-- RLS
-- ============================================================

alter table public.routines enable row level security;

-- Nadie tiene permitido DELETE en esta fase (ni alumno, ni coach, ni
-- admin): sin ninguna policy `for delete`, RLS deniega ese comando por
-- defecto para cualquier cliente. El "borrado" de la beta es lógico, vía
-- UPDATE de `archived_at` (cubierto por las policies de UPDATE de abajo).
-- Reforzado además a nivel de GRANT (ver sección final): `authenticated`
-- ni siquiera tiene el privilegio SQL de DELETE sobre esta tabla.
--
-- Todas las policies llevan `to authenticated` explícito: no aplican al
-- rol `anon` en absoluto (ver también los REVOKE/GRANT del final, que
-- cierran el acceso de `anon` también a nivel de privilegios SQL, no solo
-- de RLS).

-- --- Alumno: dueño de sus propias rutinas ---

drop policy if exists "alumno ve sus propias rutinas" on public.routines;
create policy "alumno ve sus propias rutinas"
  on public.routines for select
  to authenticated
  using (athlete_id = auth.uid());

drop policy if exists "alumno crea sus propias rutinas" on public.routines;
create policy "alumno crea sus propias rutinas"
  on public.routines for insert
  to authenticated
  with check (athlete_id = auth.uid());

drop policy if exists "alumno actualiza sus propias rutinas" on public.routines;
create policy "alumno actualiza sus propias rutinas"
  on public.routines for update
  to authenticated
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

-- --- Coach: rol 'coach' Y relación activa en coach_students (ambas condiciones) ---
-- No alcanza con encontrar una fila en coach_students: además el usuario
-- autenticado tiene que tener hoy `profiles.role = 'coach'` (vía
-- `current_user_role()`, ya definida en 0002). Cubre el caso de una
-- relación coach_students que quedó activa mientras a ese usuario ya se
-- le retiró el rol de coach.

drop policy if exists "coach ve rutinas de sus alumnos activos" on public.routines;
create policy "coach ve rutinas de sus alumnos activos"
  on public.routines for select
  to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = routines.athlete_id
        and cs.active
    )
  );

drop policy if exists "coach crea rutinas para sus alumnos activos" on public.routines;
create policy "coach crea rutinas para sus alumnos activos"
  on public.routines for insert
  to authenticated
  with check (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = routines.athlete_id
        and cs.active
    )
  );

drop policy if exists "coach actualiza rutinas de sus alumnos activos" on public.routines;
create policy "coach actualiza rutinas de sus alumnos activos"
  on public.routines for update
  to authenticated
  using (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = routines.athlete_id
        and cs.active
    )
  )
  with check (
    public.current_user_role() = 'coach'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id = routines.athlete_id
        and cs.active
    )
  );

-- --- Admin: lectura/escritura total (sin DELETE, igual que el resto) ---

drop policy if exists "admin ve todas las rutinas" on public.routines;
create policy "admin ve todas las rutinas"
  on public.routines for select
  to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists "admin crea rutinas para cualquier alumno" on public.routines;
create policy "admin crea rutinas para cualquier alumno"
  on public.routines for insert
  to authenticated
  with check (public.current_user_role() = 'admin');

drop policy if exists "admin actualiza cualquier rutina" on public.routines;
create policy "admin actualiza cualquier rutina"
  on public.routines for update
  to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- ============================================================
-- Permisos SQL explícitos (defensa en profundidad, además de RLS)
-- ============================================================
-- RLS decide QUÉ FILAS ve/toca cada quien; esto de acá decide qué
-- COMANDOS existen siquiera para cada rol, sin importar las filas. anon
-- queda sin ningún privilegio sobre esta tabla; authenticated solo tiene
-- select/insert/update — ni delete, ni truncate, ni references, ni
-- trigger, aunque el proyecto le haya otorgado esos privilegios por
-- defecto a nivel de esquema.

revoke all on public.routines from anon;
revoke all on public.routines from authenticated;
grant select, insert, update on public.routines to authenticated;
