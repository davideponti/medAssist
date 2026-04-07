-- Codice fiscale medico (profilo documenti)
alter table public.doctors add column if not exists fiscal_code text;

comment on column public.doctors.fiscal_code is 'Codice fiscale del medico';
