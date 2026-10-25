-- ============================================================================
-- Admin access list + permission helper
-- Being logged in is NOT enough to see waitlist data: the user must also have an
-- active row here. Rows can only be created/changed by a project administrator
-- (SQL editor / service role); there is no API path for it.
-- ============================================================================

create table public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text        not null default 'admin',
  is_active  boolean     not null default true,
  created_at timestamptz not null default now(),
  constraint admin_users_role_valid check (role in ('admin'))
);

comment on table public.admin_users is 'Which Supabase Auth users may use the admin dashboard. Managed only via the SQL editor / service role.';

alter table public.admin_users enable row level security;

-- Nobody can write through the API, and the API roles get no write privileges at all.
revoke all on public.admin_users from public, anon, authenticated;
grant select on public.admin_users to authenticated;
grant all on public.admin_users to service_role;

-- A signed-in user may read ONLY their own row (the frontend uses this to show
-- "not authorized" / "account inactive"). No insert/update/delete policies exist.
create policy "admin_users: read own row"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- is_admin(): used by RLS policies on other tables.
-- SECURITY DEFINER so it can read admin_users without triggering admin_users'
-- own RLS (which would otherwise risk recursion). search_path is pinned, it only
-- ever answers "is the CALLER an active admin?", and it takes no arguments, so it
-- cannot be abused to probe or escalate anyone else's privileges.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
      and au.is_active
      and au.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
