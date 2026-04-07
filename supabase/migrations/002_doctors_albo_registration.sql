-- Numero di iscrizione all'Ordine dei Medici (obbligatorio per documenti ufficiali in Italia)
alter table public.doctors
  add column if not exists albo_registration text;

comment on column public.doctors.albo_registration is 'Es. O.M. Provincia di Milano n. 12345';
