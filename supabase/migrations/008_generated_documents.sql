-- Documenti generati dall'AI (referral, lettera, certificato)
-- Sostituisce localStorage 'medassist_generated_documents' per conformita' GDPR art. 32.

create table if not exists public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  type text not null check (type in ('referral', 'letter', 'certificate')),
  patient_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists generated_documents_doctor_created_idx
  on public.generated_documents (doctor_id, created_at desc);
create index if not exists generated_documents_doctor_type_idx
  on public.generated_documents (doctor_id, type);

alter table public.generated_documents enable row level security;

drop policy if exists "generated_documents_select_own" on public.generated_documents;
drop policy if exists "generated_documents_insert_own" on public.generated_documents;
drop policy if exists "generated_documents_delete_own" on public.generated_documents;

create policy "generated_documents_select_own"
  on public.generated_documents for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "generated_documents_insert_own"
  on public.generated_documents for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "generated_documents_delete_own"
  on public.generated_documents for delete
  to authenticated
  using (doctor_id = auth.uid());
