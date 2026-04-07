-- Esegui questo script in Supabase → SQL Editor se la tabella doctors non esiste o va allineata all'app.
-- La colonna id deve coincidere con auth.users(id).

create table if not exists public.doctors (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  specialization text not null,
  clinic text,
  address text,
  phone text,
  albo_registration text,
  fiscal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists doctors_email_key on public.doctors (email);

alter table public.doctors enable row level security;

drop policy if exists "doctors_select_own" on public.doctors;
drop policy if exists "doctors_update_own" on public.doctors;

-- Lettura / aggiornamento del proprio profilo (client con JWT utente)
create policy "doctors_select_own"
  on public.doctors for select
  to authenticated
  using (auth.uid() = id);

create policy "doctors_update_own"
  on public.doctors for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- La registrazione avviene dalla API con service role (bypass RLS).
-- Se in futuro inserisci dal client, aggiungi una policy insert o usa solo la route server.
