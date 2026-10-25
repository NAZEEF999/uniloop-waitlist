-- ============================================================================
-- 1) Dashboard summary counts (no student rows are returned)
-- 2) Rate-limit bookkeeping for the public submission Edge Function
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) get_waitlist_summary(): SECURITY INVOKER, so RLS still applies; it also
--    explicitly refuses non-admins instead of quietly returning zeros.
-- ---------------------------------------------------------------------------
create or replace function public.get_waitlist_summary()
returns table (
  total             bigint,
  oou               bigint,
  unilesa           bigint,
  new_count         bigint,
  contacted_count   bigint,
  interested_count  bigint,
  converted_count   bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    count(*),
    count(*) filter (where w.university = 'OOU'),
    count(*) filter (where w.university = 'UNILESA'),
    count(*) filter (where w.status = 'new'),
    count(*) filter (where w.status = 'contacted'),
    count(*) filter (where w.status = 'interested'),
    count(*) filter (where w.status = 'converted')
  from public.waitlist w;
end;
$$;

revoke all on function public.get_waitlist_summary() from public, anon;
grant execute on function public.get_waitlist_summary() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Rate limiting. Only a salted HASH of the caller's IP is stored (never the IP),
--    and rows older than 2 days are purged. Callable by the service role only.
-- ---------------------------------------------------------------------------
create table public.waitlist_submission_attempts (
  id         bigint generated always as identity primary key,
  ip_hash    text        not null,
  created_at timestamptz not null default now()
);

create index waitlist_attempts_lookup_idx on public.waitlist_submission_attempts (ip_hash, created_at desc);
create index waitlist_attempts_created_idx on public.waitlist_submission_attempts (created_at);

alter table public.waitlist_submission_attempts enable row level security;
revoke all on public.waitlist_submission_attempts from public, anon, authenticated;
grant all on public.waitlist_submission_attempts to service_role;
-- (No policies: nobody but the service role can touch this table.)

create or replace function public.record_submission_attempt(
  p_ip_hash text,
  p_limit   integer  default 10,
  p_window  interval default interval '1 hour'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if random() < 0.02 then
    delete from public.waitlist_submission_attempts where created_at < now() - interval '2 days';
  end if;

  select count(*) into recent
  from public.waitlist_submission_attempts a
  where a.ip_hash = p_ip_hash and a.created_at > now() - p_window;

  if recent >= p_limit then
    return false;
  end if;

  insert into public.waitlist_submission_attempts (ip_hash) values (p_ip_hash);
  return true;
end;
$$;

revoke all on function public.record_submission_attempt(text, integer, interval) from public, anon, authenticated;
grant execute on function public.record_submission_attempt(text, integer, interval) to service_role;
