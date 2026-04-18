-- Visite cliniche: trascrizione + nota SOAP per medico
-- Sostituisce localStorage 'medassist_visits' per conformita' GDPR art. 32.

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  title text not null default 'Visita',
  archived boolean not null default false,
  patient_context text,
  transcription text not null,
  soap_subjective text,
  soap_objective text,
  soap_assessment text,
  soap_plan text,
  soap_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_doctor_created_idx
  on public.visits (doctor_id, created_at desc);
create index if not exists visits_doctor_archived_idx
  on public.visits (doctor_id, archived);

alter table public.visits enable row level security;

drop policy if exists "visits_select_own" on public.visits;
drop policy if exists "visits_insert_own" on public.visits;
drop policy if exists "visits_update_own" on public.visits;
drop policy if exists "visits_delete_own" on public.visits;

create policy "visits_select_own"
  on public.visits for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "visits_insert_own"
  on public.visits for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "visits_update_own"
  on public.visits for update
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "visits_delete_own"
  on public.visits for delete
  to authenticated
  using (doctor_id = auth.uid());
