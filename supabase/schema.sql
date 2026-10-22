-- HamiYami waitlist signups (used only when real collection is enabled; see .env.example).
-- Run once in the Supabase SQL editor or as a migration, in an EU region for an Italian pilot.
--
-- Rules this table enforces:
-- * One row per (email, audience). The app inserts with "ignore duplicates" and never updates rows:
--   emails are not verified, so a repeat submission could come from someone else.
-- * Consent wording and version come from the server's approved registry
--   (src/features/waitlist/consent.ts), never from the browser.
-- * Only the server-side function writes here, using the secret key. Row Level Security is enabled
--   with no policies, so the public (anon/publishable) key can neither read nor write.
--
-- Replaces the earlier `signups` table, which allowed repeat submissions to overwrite a record.
-- That table never received production data; drop it if it exists in your project.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('customer', 'cook')),
  email text not null check (char_length(email) between 3 and 254),
  city text not null check (char_length(city) between 1 and 80),
  neighborhood text check (char_length(neighborhood) <= 80),
  locale text not null default 'it' check (locale in ('it', 'en')),
  -- customer: {"meals_wanted": text|null}
  -- cook:     {"dishes": text, "food_business_experience": "operates_food_business"|"exploring"|"other_or_prefer_not"|null}
  answers jsonb not null default '{}'::jsonb,
  marketing_consent boolean not null default false,
  marketing_consent_text text,
  marketing_consent_version text,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint waitlist_signups_email_audience_key unique (email, audience),
  constraint waitlist_signups_consent_complete check (
    (marketing_consent = false and marketing_consent_text is null and marketing_consent_version is null and marketing_consent_at is null)
    or (marketing_consent = true and marketing_consent_text is not null and marketing_consent_version is not null and marketing_consent_at is not null)
  )
);

alter table public.waitlist_signups enable row level security;

revoke all on table public.waitlist_signups from anon, authenticated;

-- Defence in depth: even the server role cannot rewrite an existing signup through the API.
create or replace function public.waitlist_signups_no_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'waitlist_signups rows are insert-only; changes require a verified request';
end;
$$;

drop trigger if exists waitlist_signups_no_update on public.waitlist_signups;
create trigger waitlist_signups_no_update
  before update on public.waitlist_signups
  for each row execute function public.waitlist_signups_no_update();
