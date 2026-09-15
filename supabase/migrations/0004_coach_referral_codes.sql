-- Sprint 6.13 — códigos de invitación de entrenadores.
--
-- Un coach comparte un código corto. La alumna lo escribe al registrarse y
-- una función SECURITY DEFINER crea la relación usando SIEMPRE auth.uid()
-- como student_id. El navegador nunca puede elegir el id de la alumna ni
-- insertar directamente en coach_students.

create table if not exists public.coach_referral_codes (
  coach_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint coach_referral_codes_code_format
    check (code ~ '^[A-Z0-9]{8}$')
);

alter table public.coach_referral_codes enable row level security;

drop policy if exists "coach ve su codigo de invitacion" on public.coach_referral_codes;
create policy "coach ve su codigo de invitacion"
  on public.coach_referral_codes for select
  using (
    coach_id = auth.uid()
    and public.current_user_role() = 'coach'
  );

-- Generador interno. Ocho caracteres son cómodos para copiar y la unicidad
-- de la tabla evita que una colisión llegue a persistirse.
create or replace function public.generate_coach_referral_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.coach_referral_codes where code = candidate
    );
  end loop;
  return candidate;
end;
$$;

revoke all on function public.generate_coach_referral_code() from public;
revoke all on function public.generate_coach_referral_code() from anon;
revoke all on function public.generate_coach_referral_code() from authenticated;

-- Cada promoción futura a coach recibe un código automáticamente.
create or replace function public.ensure_coach_referral_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'coach' then
    insert into public.coach_referral_codes (coach_id, code)
    values (new.id, public.generate_coach_referral_code())
    on conflict (coach_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_coach_referral_code on public.profiles;
create trigger profiles_ensure_coach_referral_code
  after insert or update of role on public.profiles
  for each row execute function public.ensure_coach_referral_code();

-- Backfill para coaches creados antes de esta migración (incluido Lucas).
insert into public.coach_referral_codes (coach_id, code)
select p.id, public.generate_coach_referral_code()
from public.profiles p
where p.role = 'coach'
on conflict (coach_id) do nothing;

-- Validación previa al registro. El código es compartible por definición;
-- solo se informa si está habilitado y pertenece a un perfil coach, sin
-- devolver ids, nombres ni ningún otro dato.
create or replace function public.is_valid_coach_referral_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.coach_referral_codes crc
    join public.profiles p on p.id = crc.coach_id
    where crc.code = upper(trim(p_code))
      and crc.active
      and p.role = 'coach'
  );
$$;

revoke all on function public.is_valid_coach_referral_code(text) from public;
grant execute on function public.is_valid_coach_referral_code(text) to anon, authenticated;

-- Canje atómico. No acepta student_id: la alumna siempre es auth.uid().
-- Tampoco reemplaza una relación activa existente con otro entrenador.
create or replace function public.claim_coach_referral_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_student_id uuid := auth.uid();
  target_coach_id uuid;
  existing_coach_id uuid;
begin
  if current_student_id is null then
    return 'not_authenticated';
  end if;

  if public.current_user_role() is distinct from 'student' then
    return 'not_student';
  end if;

  select crc.coach_id
    into target_coach_id
  from public.coach_referral_codes crc
  join public.profiles p on p.id = crc.coach_id
  where crc.code = upper(trim(p_code))
    and crc.active
    and p.role = 'coach';

  if target_coach_id is null then
    return 'invalid_code';
  end if;

  if target_coach_id = current_student_id then
    return 'invalid_code';
  end if;

  select cs.coach_id
    into existing_coach_id
  from public.coach_students cs
  where cs.student_id = current_student_id
    and cs.active
  limit 1;

  if existing_coach_id is not null then
    if existing_coach_id = target_coach_id then
      return 'already_linked';
    end if;
    return 'already_has_coach';
  end if;

  insert into public.coach_students (coach_id, student_id, active)
  values (target_coach_id, current_student_id, true)
  on conflict (coach_id, student_id)
  do update set active = true;

  return 'linked';
exception
  when unique_violation then
    -- Protege también una carrera entre dos canjes simultáneos.
    return 'already_has_coach';
end;
$$;

revoke all on function public.claim_coach_referral_code(text) from public;
revoke all on function public.claim_coach_referral_code(text) from anon;
grant execute on function public.claim_coach_referral_code(text) to authenticated;

-- El acceso directo sigue cerrado: lectura solo para el dueño del código y
-- ninguna escritura de tabla desde clientes anon/authenticated.
revoke all on table public.coach_referral_codes from anon, authenticated;
grant select on table public.coach_referral_codes to authenticated;
