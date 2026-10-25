-- ============================================================================
-- Database + RLS test suite (runs against a local Postgres with 00_supabase_stub.sql loaded
-- and all migrations applied). Each check raises an exception on failure.
--   psql -v ON_ERROR_STOP=1 -d <db> -f 10_db_tests.sql
-- ============================================================================
create schema if not exists t;

create or replace function t.run(p_role text, p_uid uuid, p_sql text) returns text
language plpgsql as $$
declare n bigint; res text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    res := 'ok:' || n;
  exception when others then
    res := 'err:' || sqlstate;
  end;
  execute 'reset role';
  return res;
end $$;

create or replace function t.eq(p_name text, p_actual text, p_expected text) returns void
language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % (expected %, got %)', p_name, p_expected, p_actual;
  end if;
  raise notice 'PASS: %', p_name;
end $$;

truncate public.waitlist, public.admin_users, public.waitlist_submission_attempts restart identity cascade;
delete from auth.users;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.dev'),
  ('00000000-0000-0000-0000-00000000000b', 'inactive@test.dev'),
  ('00000000-0000-0000-0000-00000000000c', 'student@test.dev');
insert into public.admin_users (user_id, is_active) values
  ('00000000-0000-0000-0000-00000000000a', true),
  ('00000000-0000-0000-0000-00000000000b', false);

do $$
declare
  A uuid := '00000000-0000-0000-0000-00000000000a';  -- active admin
  B uuid := '00000000-0000-0000-0000-00000000000b';  -- inactive admin
  C uuid := '00000000-0000-0000-0000-00000000000c';  -- signed-in, not an admin
  v text; flag boolean; s record; before_ts timestamptz; after_ts timestamptz; created1 timestamptz; created2 timestamptz;
begin
  raise notice '--- CONSTRAINTS & SERVER-SIDE DATA RULES (service role inserts) ---';
  perform t.eq('valid OOU insert',     t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('Ada Okafor','ada@example.com','OOU','buy')$q$), 'ok:1');
  perform t.eq('valid UNILESA insert with interests/phone/consent', t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use,interests,whatsapp_number,email_marketing_consent) values ('Tunde B','tunde@example.com','UNILESA','student_business','{hostel,food}','+2348012345678',true)$q$), 'ok:1');
  perform t.eq('reject invalid university',   t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('X Y','x1@example.com','LASU','buy')$q$), 'err:23514');
  perform t.eq('reject invalid intended_use', t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('X Y','x2@example.com','OOU','rent')$q$), 'err:23514');
  perform t.eq('reject invalid status',       t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use,status) values ('X Y','x3@example.com','OOU','buy','archived')$q$), 'err:23514');
  perform t.eq('reject duplicate email',      t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('Dup','ada@example.com','OOU','buy')$q$), 'err:23505');
  perform t.eq('reject duplicate email (case/whitespace normalised)', t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('Dup','  ADA@Example.COM ','UNILESA','sell')$q$), 'err:23505');
  perform t.eq('reject invalid interest',     t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use,interests) values ('X Y','x4@example.com','OOU','buy','{weapons}')$q$), 'err:23514');
  perform t.eq('reject invalid phone',        t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use,whatsapp_number) values ('X Y','x5@example.com','OOU','buy','08012345678')$q$), 'err:23514');
  perform t.eq('reject too-short name',       t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('A','x6@example.com','OOU','buy')$q$), 'err:23514');
  perform t.eq('reject null name',            t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values (null,'x7@example.com','OOU','buy')$q$), 'err:23502');
  perform t.eq('reject malformed email',      t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('X Y','not-an-email','OOU','buy')$q$), 'err:23514');

  perform t.eq('email stored lowercase & trimmed', (select email from public.waitlist where full_name='Ada Okafor'), 'ada@example.com');
  perform t.run('service_role', null, $q$insert into public.waitlist (full_name,email,university,intended_use,created_at,consent_recorded_at) values ('  Spaced Name  ','  MIXED@Example.com ','OOU','both','2001-01-01',null)$q$);
  perform t.eq('trigger lowercases/trims email on insert', (select email from public.waitlist where full_name='Spaced Name'), 'mixed@example.com');
  perform t.eq('client-supplied created_at is overridden', (select (created_at > now() - interval '1 minute')::text from public.waitlist where email='mixed@example.com'), 'true');
  perform t.eq('consent=true -> consent_recorded_at set',  (select (consent_recorded_at is not null)::text from public.waitlist where email='tunde@example.com'), 'true');
  perform t.eq('consent=false -> consent_recorded_at null', (select (consent_recorded_at is null and not email_marketing_consent)::text from public.waitlist where email='ada@example.com'), 'true');
  perform t.eq('default status is new', (select status from public.waitlist where email='ada@example.com'), 'new');

  raise notice '--- PUBLIC VISITOR (anon) ---';
  perform t.eq('anon cannot SELECT waitlist', t.run('anon', null, 'select * from public.waitlist'), 'err:42501');
  perform t.eq('anon cannot INSERT waitlist', t.run('anon', null, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('Hack','h@example.com','OOU','buy')$q$), 'err:42501');
  perform t.eq('anon cannot UPDATE waitlist', t.run('anon', null, $q$update public.waitlist set status='converted'$q$), 'err:42501');
  perform t.eq('anon cannot DELETE waitlist', t.run('anon', null, 'delete from public.waitlist'), 'err:42501');
  perform t.eq('anon cannot read admin_users', t.run('anon', null, 'select * from public.admin_users'), 'err:42501');
  perform t.eq('anon cannot write admin_users', t.run('anon', null, $q$insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-00000000000c')$q$), 'err:42501');
  perform t.eq('anon cannot call is_admin()', t.run('anon', null, 'select public.is_admin()'), 'err:42501');
  perform t.eq('anon cannot call get_waitlist_summary()', t.run('anon', null, 'select * from public.get_waitlist_summary()'), 'err:42501');
  perform t.eq('anon cannot call record_submission_attempt()', t.run('anon', null, $q$select public.record_submission_attempt('x')$q$), 'err:42501');
  perform t.eq('anon cannot read rate-limit table', t.run('anon', null, 'select * from public.waitlist_submission_attempts'), 'err:42501');

  raise notice '--- SIGNED-IN BUT NOT AN ADMIN ---';
  perform t.eq('non-admin sees 0 waitlist rows', t.run('authenticated', C, 'select * from public.waitlist'), 'ok:0');
  perform t.eq('non-admin update affects 0 rows', t.run('authenticated', C, $q$update public.waitlist set status='converted'$q$), 'ok:0');
  perform t.eq('non-admin cannot INSERT waitlist', t.run('authenticated', C, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('Hack','h2@example.com','OOU','buy')$q$), 'err:42501');
  perform t.eq('non-admin cannot DELETE waitlist', t.run('authenticated', C, 'delete from public.waitlist'), 'err:42501');
  perform t.eq('non-admin cannot read other admin rows', t.run('authenticated', C, 'select * from public.admin_users'), 'ok:0');
  perform t.eq('non-admin CANNOT self-promote (insert admin_users)', t.run('authenticated', C, $q$insert into public.admin_users (user_id, is_active) values ('00000000-0000-0000-0000-00000000000c', true)$q$), 'err:42501');
  perform t.eq('non-admin cannot modify admin_users', t.run('authenticated', C, 'update public.admin_users set is_active = true'), 'err:42501');
  perform t.eq('summary refuses non-admin', t.run('authenticated', C, 'select * from public.get_waitlist_summary()'), 'err:42501');
  perform t.eq('non-admin cannot call record_submission_attempt()', t.run('authenticated', C, $q$select public.record_submission_attempt('x')$q$), 'err:42501');
  perform t.eq('non-admin cannot read rate-limit table', t.run('authenticated', C, 'select * from public.waitlist_submission_attempts'), 'err:42501');
  perform t.eq('non-admin: nothing changed in DB', (select count(*) filter (where status <> 'new')::text from public.waitlist), '0');

  raise notice '--- INACTIVE ADMIN ---';
  perform t.eq('inactive admin sees 0 waitlist rows', t.run('authenticated', B, 'select * from public.waitlist'), 'ok:0');
  perform t.eq('inactive admin update affects 0 rows', t.run('authenticated', B, $q$update public.waitlist set status='contacted'$q$), 'ok:0');
  perform t.eq('inactive admin summary refused', t.run('authenticated', B, 'select * from public.get_waitlist_summary()'), 'err:42501');
  perform t.eq('inactive admin can read own admin row (to show "inactive")', t.run('authenticated', B, 'select * from public.admin_users'), 'ok:1');

  raise notice '--- ACTIVE ADMIN ---';
  perform t.eq('admin reads all waitlist rows', t.run('authenticated', A, 'select * from public.waitlist'), 'ok:3');
  perform t.eq('admin reads only OWN admin_users row', t.run('authenticated', A, 'select * from public.admin_users'), 'ok:1');
  perform t.eq('admin can update status', t.run('authenticated', A, $q$update public.waitlist set status='contacted' where email='ada@example.com'$q$), 'ok:1');
  perform t.eq('status persisted', (select status from public.waitlist where email='ada@example.com'), 'contacted');
  perform t.eq('admin can update admin_notes', t.run('authenticated', A, $q$update public.waitlist set admin_notes='Called on Monday' where email='ada@example.com'$q$), 'ok:1');
  perform t.eq('notes persisted', (select admin_notes from public.waitlist where email='ada@example.com'), 'Called on Monday');
  perform t.eq('admin cannot set invalid status', t.run('authenticated', A, $q$update public.waitlist set status='vip' where email='ada@example.com'$q$), 'err:23514');
  perform t.eq('admin cannot store >5000-char notes', t.run('authenticated', A, $q$update public.waitlist set admin_notes=repeat('x',5001) where email='ada@example.com'$q$), 'err:23514');
  perform t.eq('admin cannot edit full_name',  t.run('authenticated', A, $q$update public.waitlist set full_name='Changed' where email='ada@example.com'$q$), 'err:42501');
  perform t.eq('admin cannot edit email',      t.run('authenticated', A, $q$update public.waitlist set email='changed@example.com' where email='ada@example.com'$q$), 'err:42501');
  perform t.eq('admin cannot edit consent',    t.run('authenticated', A, $q$update public.waitlist set email_marketing_consent=true where email='ada@example.com'$q$), 'err:42501');
  perform t.eq('admin cannot edit created_at', t.run('authenticated', A, $q$update public.waitlist set created_at=now() where email='ada@example.com'$q$), 'err:42501');
  perform t.eq('admin cannot DELETE waitlist', t.run('authenticated', A, 'delete from public.waitlist'), 'err:42501');
  perform t.eq('admin cannot INSERT waitlist via API', t.run('authenticated', A, $q$insert into public.waitlist (full_name,email,university,intended_use) values ('Hack','h3@example.com','OOU','buy')$q$), 'err:42501');
  perform t.eq('admin CANNOT change own role',      t.run('authenticated', A, $q$update public.admin_users set role='admin'$q$), 'err:42501');
  perform t.eq('admin CANNOT change is_active',     t.run('authenticated', A, $q$update public.admin_users set is_active=false$q$), 'err:42501');
  perform t.eq('admin CANNOT add other admins',     t.run('authenticated', A, $q$insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-00000000000c')$q$), 'err:42501');
  perform t.eq('admin cannot delete admin rows',    t.run('authenticated', A, 'delete from public.admin_users'), 'err:42501');
  perform t.eq('admin cannot call record_submission_attempt()', t.run('authenticated', A, $q$select public.record_submission_attempt('x')$q$), 'err:42501');
  perform t.eq('admin_users unchanged after attempts', (select count(*)::text from public.admin_users), '2');

  raise notice '--- SUMMARY FUNCTION & ADMIN CHECK ---';
  perform set_config('request.jwt.claim.sub', A::text, true);
  set local role authenticated;
  select * into s from public.get_waitlist_summary();
  flag := public.is_admin();
  reset role;
  perform t.eq('summary total',      s.total::text, '3');
  perform t.eq('summary OOU',        s.oou::text, '2');
  perform t.eq('summary UNILESA',    s.unilesa::text, '1');
  perform t.eq('summary new_count',  s.new_count::text, '2');
  perform t.eq('summary interested', s.interested_count::text, '0');
  perform t.eq('is_admin() true for active admin', flag::text, 'true');
  perform set_config('request.jwt.claim.sub', C::text, true);
  set local role authenticated; flag := public.is_admin(); reset role;
  perform t.eq('is_admin() false for non-admin', flag::text, 'false');
  perform set_config('request.jwt.claim.sub', B::text, true);
  set local role authenticated; flag := public.is_admin(); reset role;
  perform t.eq('is_admin() false for inactive admin', flag::text, 'false');

  raise notice '--- RATE LIMIT FUNCTION (service role only) ---';
  set local role service_role;
  v := public.record_submission_attempt('hash-1', 3, interval '1 hour')::text
    || ',' || public.record_submission_attempt('hash-1', 3, interval '1 hour')::text
    || ',' || public.record_submission_attempt('hash-1', 3, interval '1 hour')::text
    || ',' || public.record_submission_attempt('hash-1', 3, interval '1 hour')::text
    || ',' || public.record_submission_attempt('hash-2', 3, interval '1 hour')::text;
  reset role;
  perform t.eq('allows 3, blocks the 4th, other IPs unaffected', v, 'true,true,true,false,true');

  raise notice 'ALL DATABASE TESTS PASSED';
end $$;

-- updated_at / created_at behaviour. Run as separate top-level statements, because
-- now() is frozen inside a single transaction (each real API request is its own transaction).
select created_at as created1, updated_at as updated1 from public.waitlist where email='ada@example.com' \gset
select pg_sleep(0.1);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
set role authenticated;
update public.waitlist set status='converted' where email='ada@example.com';
reset role;
select (updated_at > :'updated1'::timestamptz) as updated_advanced, (created_at = :'created1'::timestamptz) as created_unchanged from public.waitlist where email='ada@example.com' \gset
select t.eq('updated_at advances on admin edit', :'updated_advanced', 't');
select t.eq('created_at unchanged on admin edit', :'created_unchanged', 't');
