-- ============================================================================
-- Uniloop waitlist: core table
-- Public visitors never touch this table directly. Submissions arrive through
-- the `submit-waitlist` Edge Function (service role), and only authorized admins
-- can read/update rows (see migration 3).
-- ============================================================================

create extension if not exists pg_trgm with schema extensions;

create table public.waitlist (
  id                       uuid primary key default gen_random_uuid(),
  full_name                text        not null,
  email                    text        not null,
  university               text        not null,
  intended_use             text        not null,
  interests                text[]      not null default '{}',
  whatsapp_number          text,
  email_marketing_consent  boolean     not null default false,
  consent_recorded_at      timestamptz,
  status                   text        not null default 'new',
  admin_notes              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint waitlist_full_name_len
    check (char_length(btrim(full_name)) between 2 and 100),

  -- Stored normalized (trimmed + lowercase); the trigger below does the normalizing,
  -- this constraint is the backstop that guarantees the unique index below is case-insensitive.
  constraint waitlist_email_normalized
    check (email = lower(btrim(email))),
  constraint waitlist_email_format
    check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  constraint waitlist_email_unique unique (email),

  constraint waitlist_university_valid
    check (university in ('OOU', 'UNILESA')),
  constraint waitlist_intended_use_valid
    check (intended_use in ('buy', 'sell', 'both', 'student_business')),
  constraint waitlist_interests_valid
    check (
      cardinality(interests) <= 6
      and interests <@ array['hostel','electronics','textbooks','fashion','food','other']::text[]
    ),
  -- International format without spaces, e.g. +2348012345678
  constraint waitlist_whatsapp_format
    check (whatsapp_number is null or whatsapp_number ~ '^\+[0-9]{8,15}$'),
  constraint waitlist_consent_timestamp
    check (
      (email_marketing_consent and consent_recorded_at is not null)
      or (not email_marketing_consent and consent_recorded_at is null)
    ),
  constraint waitlist_status_valid
    check (status in ('new', 'contacted', 'interested', 'converted')),
  constraint waitlist_admin_notes_len
    check (admin_notes is null or char_length(admin_notes) <= 5000)
);

comment on table public.waitlist is 'Pre-launch waitlist sign-ups. Private: readable only by active admins (RLS).';
comment on column public.waitlist.email_marketing_consent is 'True only if the student explicitly ticked the email-updates box. A submitted email is NOT consent.';

-- Indexes for the dashboard's server-side search / filter / sort / pagination.
create index waitlist_created_at_idx  on public.waitlist (created_at desc);
create index waitlist_status_idx      on public.waitlist (status);
create index waitlist_university_idx  on public.waitlist (university);
create index waitlist_full_name_trgm  on public.waitlist using gin (full_name extensions.gin_trgm_ops);
create index waitlist_email_trgm      on public.waitlist using gin (email extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Server-side data hygiene (not trusting the client for any of this)
-- ---------------------------------------------------------------------------
create or replace function public.waitlist_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.email      := lower(btrim(new.email));
  new.full_name  := btrim(new.full_name);
  new.created_at := now();
  new.updated_at := now();
  new.consent_recorded_at := case when new.email_marketing_consent then now() else null end;
  return new;
end;
$$;

create trigger waitlist_before_insert
  before insert on public.waitlist
  for each row execute function public.waitlist_before_insert();

create or replace function public.waitlist_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id         := old.id;          -- immutable
  new.created_at := old.created_at;  -- immutable
  new.updated_at := now();
  if new.email_marketing_consent is distinct from old.email_marketing_consent then
    new.consent_recorded_at := case when new.email_marketing_consent then now() else null end;
  end if;
  return new;
end;
$$;

create trigger waitlist_before_update
  before update on public.waitlist
  for each row execute function public.waitlist_before_update();
