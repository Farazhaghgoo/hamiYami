-- HamiYami waitlist signups.
-- Run once in the Supabase SQL editor (or as a migration) before connecting the form.
-- Only the server-side function writes here, using the secret key. Row Level Security is
-- enabled with no policies, so the public (anon/publishable) key can neither read nor write.

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('customer', 'cook')),
  email text not null check (char_length(email) <= 254),
  city text not null check (char_length(city) between 1 and 80),
  neighborhood text check (char_length(neighborhood) <= 80),
  -- customer: {"meals_wanted": text|null}
  -- cook:     {"dishes": text, "food_business_experience": "operates_food_business"|"exploring"|"other_or_prefer_not"|null}
  answers jsonb not null default '{}'::jsonb,
  marketing_consent boolean not null default false,
  marketing_consent_text text,
  marketing_consent_version text,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),   -- first signup
  updated_at timestamptz not null default now(),   -- latest submission
  constraint signups_email_audience_key unique (email, audience)
);

alter table public.signups enable row level security;

revoke all on table public.signups from anon, authenticated;
