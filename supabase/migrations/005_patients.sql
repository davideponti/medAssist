-- Pazienti dello studio, collegati al medico (auth.users / doctors.id)

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  name text not null,
  age int,
  phone text,
  email text,
  last_visit date,
  diagnosis text,
  medications text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists patients_doctor_id_idx on public.patients (doctor_id);
create index if not exists patients_doctor_name_idx on public.patients (doctor_id, name);

alter table public.patients enable row level security;

drop policy if exists "patients_select_own" on public.patients;
drop policy if exists "patients_insert_own" on public.patients;
drop policy if exists "patients_update_own" on public.patients;
drop policy if exists "patients_delete_own" on public.patients;

create policy "patients_select_own"
  on public.patients for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "patients_insert_own"
  on public.patients for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "patients_update_own"
  on public.patients for update
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "patients_delete_own"
  on public.patients for delete
  to authenticated
  using (doctor_id = auth.uid());
