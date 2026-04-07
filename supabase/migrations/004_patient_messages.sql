-- Messaggi inviati dai pazienti tramite pagina pubblica /c/[doctorId]
-- Inserimento solo da API server (service role). Lettura/aggiornamento dal med autenticato (RLS).

create table if not exists public.patient_messages (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_name text not null,
  patient_email text,
  body text not null,
  ai_suggested_reply text,
  suggested_action text,
  doctor_reply text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists patient_messages_doctor_created_idx
  on public.patient_messages (doctor_id, created_at desc);

alter table public.patient_messages enable row level security;

drop policy if exists "patient_messages_select_own" on public.patient_messages;
drop policy if exists "patient_messages_update_own" on public.patient_messages;

create policy "patient_messages_select_own"
  on public.patient_messages for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "patient_messages_update_own"
  on public.patient_messages for update
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());
