-- ============================================================================
-- Run ONCE in the Supabase SQL Editor (as the project owner) AFTER you have created the user in
-- Authentication -> Users -> "Add user" (email + password, tick "Auto Confirm User").
-- This is NOT a migration and must never be exposed through the frontend or an API.
-- ============================================================================

-- 1) Replace the email with the admin's real address, then run:
insert into public.admin_users (user_id, role, is_active)
select id, 'admin', true
from auth.users
where email = 'REPLACE-WITH-ADMIN-EMAIL@example.com';

-- 2) Confirm exactly one row was added and it is active:
select au.user_id, u.email, au.role, au.is_active, au.created_at
from public.admin_users au
join auth.users u on u.id = au.user_id;

-- To suspend an admin later (they are denied immediately on their next request):
--   update public.admin_users set is_active = false where user_id = '<their-user-id>';
-- To re-enable:
--   update public.admin_users set is_active = true  where user_id = '<their-user-id>';
