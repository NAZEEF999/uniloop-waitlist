-- ============================================================================
-- Row Level Security for public.waitlist
--
--   public / anon       : no access at all (writes go through the Edge Function)
--   signed-in non-admin : no access
--   inactive admin      : no access
--   active admin        : read all rows; update ONLY status and admin_notes
--   delete              : nobody via the API
-- ============================================================================

alter table public.waitlist enable row level security;

-- Start from zero, then grant back the minimum.
revoke all on public.waitlist from public, anon, authenticated;
grant select on public.waitlist to authenticated;
-- Column-level: admins can change only these two columns, nothing else.
grant update (status, admin_notes) on public.waitlist to authenticated;
grant all on public.waitlist to service_role;

create policy "waitlist: admins can read"
  on public.waitlist
  for select
  to authenticated
  using (public.is_admin());

create policy "waitlist: admins can update status and notes"
  on public.waitlist
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Intentionally NO insert, delete, or anon policies.
