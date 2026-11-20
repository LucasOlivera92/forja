-- Sprint 9.0 — red de coaches administrada por el dueño de FORJA.
-- Lucas conserva role='coach' (y por lo tanto sus propios alumnos) y se le
-- otorga, por separado, capacidad administrativa para invitar otros coaches.

create table if not exists public.forja_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.forja_admins enable row level security;

-- Dueño inicial. La búsqueda por email evita fijar un UUID de entorno.
insert into public.forja_admins (user_id)
select p.id
from public.profiles p
join auth.users u on u.id = p.id
where lower(u.email) = lower('lholivera789@gmail.com')
on conflict (user_id) do nothing;

create or replace function public.is_forja_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.forja_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_forja_admin() from public, anon;
grant execute on function public.is_forja_admin() to authenticated;

drop policy if exists "dueño ve administradores forja" on public.forja_admins;
create policy "dueño ve administradores forja"
  on public.forja_admins for select to authenticated
  using (public.is_forja_admin());

create table if not exists public.coach_invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  claimed_by uuid references public.profiles(id),
  claimed_at timestamptz,
  active boolean not null default true,
  constraint coach_invite_codes_code_format check (code ~ '^[A-Z0-9]{16}$'),
  constraint coach_invite_codes_claim_consistency check (
    (claimed_by is null and claimed_at is null) or
    (claimed_by is not null and claimed_at is not null)
  )
);

alter table public.coach_invite_codes enable row level security;

drop policy if exists "dueño ve invitaciones coach" on public.coach_invite_codes;
create policy "dueño ve invitaciones coach"
  on public.coach_invite_codes for select to authenticated
  using (public.is_forja_admin());

create or replace function public.create_coach_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  if not public.is_forja_admin() then
    raise exception 'not_authorized';
  end if;

  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
    exit when not exists (select 1 from public.coach_invite_codes where code = candidate);
  end loop;

  insert into public.coach_invite_codes (code, created_by)
  values (candidate, auth.uid());
  return candidate;
end;
$$;

revoke all on function public.create_coach_invite_code() from public, anon;
grant execute on function public.create_coach_invite_code() to authenticated;

create or replace function public.is_valid_coach_invite_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.coach_invite_codes
    where code = upper(trim(p_code))
      and active
      and claimed_by is null
      and expires_at > now()
  );
$$;

revoke all on function public.is_valid_coach_invite_code(text) from public;
grant execute on function public.is_valid_coach_invite_code(text) to anon, authenticated;

-- Permite únicamente la transición student→coach cuando la función segura
-- de canje marcó esta transacción para el mismo usuario.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_claim_user text := current_setting('forja.coach_invite_claim', true);
begin
  if new.role is distinct from old.role then
    if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
      and not (
        old.role = 'student'
        and new.role = 'coach'
        and invite_claim_user = new.id::text
      ) then
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.claim_coach_invite_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invite_id uuid;
  current_role text;
begin
  if current_user_id is null then return 'not_authenticated'; end if;

  select role into current_role from public.profiles where id = current_user_id;
  if current_role = 'coach' then return 'already_coach'; end if;
  if current_role is distinct from 'student' then return 'not_student'; end if;

  select id into invite_id
  from public.coach_invite_codes
  where code = upper(trim(p_code))
    and active
    and claimed_by is null
    and expires_at > now()
  for update;

  if invite_id is null then return 'invalid_code'; end if;

  perform set_config('forja.coach_invite_claim', current_user_id::text, true);
  update public.profiles set role = 'coach' where id = current_user_id;
  update public.coach_invite_codes
    set claimed_by = current_user_id, claimed_at = now(), active = false
    where id = invite_id;
  return 'promoted';
end;
$$;

revoke all on function public.claim_coach_invite_code(text) from public, anon;
grant execute on function public.claim_coach_invite_code(text) to authenticated;

-- El dueño puede ver la red completa sin convertirse en role='admin' y sin
-- perder su identidad de coach.
drop policy if exists "dueño forja ve perfiles" on public.profiles;
create policy "dueño forja ve perfiles"
  on public.profiles for select to authenticated
  using (public.is_forja_admin());

drop policy if exists "dueño forja ve relaciones coach alumnos" on public.coach_students;
create policy "dueño forja ve relaciones coach alumnos"
  on public.coach_students for select to authenticated
  using (public.is_forja_admin());

revoke all on table public.coach_invite_codes from anon, authenticated;
grant select on table public.coach_invite_codes to authenticated;

