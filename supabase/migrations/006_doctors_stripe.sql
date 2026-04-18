-- Aggiunge campi Stripe per gestione abbonamenti

alter table public.doctors
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists subscription_status text default 'inactive',
add column if not exists cancel_at_period_end boolean default false,
add column if not exists current_period_end timestamptz;

-- Indici per performance
create index if not exists doctors_stripe_customer_idx on public.doctors (stripe_customer_id);
create index if not exists doctors_stripe_subscription_idx on public.doctors (stripe_subscription_id);
