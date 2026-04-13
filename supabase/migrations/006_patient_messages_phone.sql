-- Aggiunge contatto telefonico per i messaggi pazienti
alter table if exists public.patient_messages
  add column if not exists patient_phone text;

