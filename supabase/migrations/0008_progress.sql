-- Sprint 8.3 — Objetivos de progreso y check-in fotográfico mensual.
-- Fotos privadas: bucket no público, carpeta raíz = athlete_id.

create table public.progress_goals (
  athlete_id uuid primary key references public.profiles(id),
  starting_weight_kg numeric(5,2),
  target_weight_kg numeric(5,2),
  workouts_per_week integer not null default 3 check (workouts_per_week between 1 and 14),
  sleep_hours numeric(4,2) not null default 8 check (sleep_hours between 1 and 24),
  nutrition_adherence integer not null default 90 check (nutrition_adherence between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.progress_checkins (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(id),
  checkin_month date not null,
  weight_kg numeric(5,2),
  waist_cm numeric(5,2),
  front_path text not null,
  side_path text not null,
  back_path text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint progress_checkins_athlete_month_key unique (athlete_id, checkin_month),
  constraint progress_checkins_month_first_day check (extract(day from checkin_month) = 1)
);

create index progress_checkins_athlete_month_idx
  on public.progress_checkins (athlete_id, checkin_month desc);

create function public.progress_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.athlete_id := old.athlete_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger progress_goals_set_updated_at
  before update on public.progress_goals
  for each row execute function public.progress_set_updated_at();

create trigger progress_checkins_set_updated_at
  before update on public.progress_checkins
  for each row execute function public.progress_set_updated_at();

alter table public.progress_goals enable row level security;
alter table public.progress_checkins enable row level security;

create policy progress_goals_select_own on public.progress_goals for select to authenticated
  using (athlete_id = auth.uid());
create policy progress_goals_insert_own on public.progress_goals for insert to authenticated
  with check (athlete_id = auth.uid());
create policy progress_goals_update_own on public.progress_goals for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy progress_goals_select_coach on public.progress_goals for select to authenticated
  using (exists (
    select 1 from public.coach_students cs
    where cs.coach_id = auth.uid() and cs.student_id = progress_goals.athlete_id and cs.active
  ));

create policy progress_checkins_select_own on public.progress_checkins for select to authenticated
  using (athlete_id = auth.uid());
create policy progress_checkins_insert_own on public.progress_checkins for insert to authenticated
  with check (athlete_id = auth.uid());
create policy progress_checkins_update_own on public.progress_checkins for update to authenticated
  using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy progress_checkins_select_coach on public.progress_checkins for select to authenticated
  using (exists (
    select 1 from public.coach_students cs
    where cs.coach_id = auth.uid() and cs.student_id = progress_checkins.athlete_id and cs.active
  ));

revoke all on public.progress_goals from anon, authenticated;
grant select, insert, update on public.progress_goals to authenticated;
revoke all on public.progress_checkins from anon, authenticated;
grant select, insert, update on public.progress_checkins to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy progress_photos_select_own on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy progress_photos_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy progress_photos_update_own on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy progress_photos_select_coach on storage.objects for select to authenticated
  using (
    bucket_id = 'progress-photos'
    and exists (
      select 1 from public.coach_students cs
      where cs.coach_id = auth.uid()
        and cs.student_id::text = (storage.foldername(name))[1]
        and cs.active
    )
  );

