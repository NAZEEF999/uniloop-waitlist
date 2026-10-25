# Uniloop Waitlist: Frontend + Supabase Backend

Public waitlist site (`/`), admin login (`/admin/login`) and admin dashboard (`/admin/dashboard`),
backed by **Supabase** (PostgreSQL, Auth, Row Level Security, Edge Functions). Launching at **OOU** and **UNILESA**.

```
Browser ──(form)──────────► Edge Function `submit-waitlist` ──(service role, server-only)──► waitlist table
Browser ──(admin session)──► PostgREST API ──► Row Level Security ──► waitlist / admin_users
```

* **Public visitors** can only call the Edge Function. They have **no** direct table access (reads, writes, counts all denied).
* **Admins** sign in with Supabase Auth. Access also requires an **active** row in `admin_users`; Row Level Security enforces
  this in the database, independent of anything the frontend does.
* The **service-role key exists only inside the Edge Function** (Supabase injects it). It is never in the frontend.

---

## 1. Database structure

| Table | Purpose |
| --- | --- |
| `waitlist` | Sign-ups. `university` ∈ OOU/UNILESA · `intended_use` ∈ buy/sell/both/student_business · `status` ∈ new/contacted/interested/converted · unique normalized `email` · `interests text[]` (validated) · optional `whatsapp_number` (`+` international format) · `email_marketing_consent` + `consent_recorded_at` (kept consistent by a CHECK + trigger) · `admin_notes` (≤ 5000 chars) · `created_at` / `updated_at` (set by triggers). |
| `admin_users` | Which Auth users may use the dashboard: `user_id` → `auth.users` (cascade), `role` (`admin`), `is_active`. Writable only by a project administrator via SQL / service role. |
| `waitlist_submission_attempts` | Rate-limit bookkeeping (salted IP hash only, auto-purged). No API access. |

Functions: `is_admin()` (SECURITY DEFINER, pinned `search_path`, no arguments, not callable by `anon`),
`get_waitlist_summary()` (counts only, refuses non-admins), `record_submission_attempt()` (service role only).

### Who can do what

| | Public / anon | Signed-in, not admin | Inactive admin | Active admin |
| --- | --- | --- | --- | --- |
| Submit sign-up | via Edge Function only | via Edge Function only | via Edge Function only | via Edge Function only |
| Read `waitlist` | ✗ | ✗ (0 rows) | ✗ (0 rows) | ✓ |
| Change `status`, `admin_notes` | ✗ | ✗ | ✗ | ✓ (only these two columns) |
| Change name/email/consent/timestamps, delete | ✗ | ✗ | ✗ | ✗ |
| Read `admin_users` | ✗ | ✗ | own row only | own row only |
| Create/modify admins | ✗ | ✗ | ✗ | ✗ (SQL editor / service role only) |

---

## 2. Setup (one time)

You need a Supabase project and the [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase` or `npx supabase`).

### Step 1: Create or select the project
Create a project at https://supabase.com/dashboard. Note the **Project ref** (the `xxxx` in `https://xxxx.supabase.co`).
If the project already contains data, inspect it first. These migrations only create new tables and do not drop or overwrite anything.

### Step 2: Apply the migrations
```bash
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```
No CLI? Open **SQL Editor** and run the four files in `supabase/migrations/` **in filename order**.

### Step 3: Turn off public sign-ups (recommended)
Dashboard → **Authentication → Sign In / Providers → Email**: disable **"Allow new users to sign up"**.
(Even if left on, new users still could not see any data, but admin accounts should only ever be created by you.)

### Step 4: Frontend environment variables
```bash
cp .env.example .env
```
Fill in **Project Settings → API**:
* `VITE_SUPABASE_URL`: your project URL
* `VITE_SUPABASE_ANON_KEY`: the **anon / publishable** key (**never** the `service_role` / secret key)

These two are public by design. `.env` is git-ignored.

### Step 5: Deploy the Edge Function
```bash
supabase functions deploy submit-waitlist --no-verify-jwt
```
(`supabase/config.toml` also sets `verify_jwt = false`. The endpoint is intentionally public and does its own validation.)

### Step 6: Set the Edge Function secrets
```bash
supabase secrets set RATE_LIMIT_SALT="$(openssl rand -hex 32)"
supabase secrets set ALLOWED_ORIGINS="https://YOUR-LIVE-SITE.example,http://localhost:5173"
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions automatically. You do not set them.
If `ALLOWED_ORIGINS` is not set, any website may call the (public) endpoint.

### Step 7: Create the first admin account
1. Dashboard → **Authentication → Users → Add user** → enter email + a strong password, tick **Auto Confirm User**.
2. Open `supabase/create_first_admin.sql` in the **SQL Editor**, put that email in, run it, and confirm one active row is returned.

Further admins: repeat both parts. There is deliberately **no** admin sign-up page and no API for creating admins.
Consider enabling MFA and leaked-password protection under Authentication settings.

### Step 8: Run and test
```bash
npm install
npm run dev          # http://localhost:5173
```
1. Submit the form at `/` → success screen → check **Table Editor → waitlist** for the row.
2. Submit the same email again → "You're already on the list".
3. Sign in at `/admin/login` with the admin from Step 7 → dashboard shows the row.
4. Change a status, add a note, reload the page, and confirm both persisted. Export a CSV.
5. Sign in with any non-admin Auth user → "isn't authorized"; they see no data.

---

## 3. Environment variables

| Name | Where | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend `.env` | No (public) |
| `VITE_SUPABASE_ANON_KEY` | frontend `.env` | No (public anon/publishable key) |
| `RATE_LIMIT_SALT` | `supabase secrets set` | **Yes** |
| `ALLOWED_ORIGINS` | `supabase secrets set` | No (optional allow-list) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | injected by Supabase into the function | **Yes**, server-only, never put in frontend |

---

## 4. Files

```
supabase/
  config.toml                               function config (verify_jwt = false)
  create_first_admin.sql                    run once in SQL Editor (not a migration)
  migrations/
    20261021000001_create_waitlist.sql
    20261021000002_create_admin_users.sql
    20261021000003_waitlist_rls.sql
    20261021000004_admin_functions_and_rate_limit.sql
  functions/submit-waitlist/
    index.ts        Deno entrypoint        handler.js  request logic        validate.js  server-side validation
    handler.test.mjs   unit tests
  tests/
    00_supabase_stub.sql   recreates Supabase roles/auth for a LOCAL scratch Postgres only
    10_db_tests.sql        constraint + RLS test suite
src/services/   waitlistService.js (public form) · authService.js · adminWaitlistService.js (dashboard data)
src/context/AuthProvider.jsx · src/lib/supabaseClient.js
```

### Running the tests yourself
```bash
npm run test:functions                     # Edge Function logic (19 tests)

# Database + RLS suite, on a throwaway local Postgres (NOT your Supabase project):
createdb uniloop_test
psql -d uniloop_test -v ON_ERROR_STOP=1 -f supabase/tests/00_supabase_stub.sql
for f in supabase/migrations/*.sql; do psql -d uniloop_test -v ON_ERROR_STOP=1 -f "$f"; done
psql -d uniloop_test -v ON_ERROR_STOP=1 -f supabase/tests/10_db_tests.sql   # 74 checks
```

---

## 5. Test results

All run on **a local stand-in for Supabase**: real PostgreSQL 16 running these migrations, real PostgREST 12.2 (the API layer
Supabase uses), the real Edge Function code (also run under Deno 2.9), and a small fake of Supabase Auth. **Not yet run against
a live Supabase project**; Step 8 above is how you confirm that.

| Area | Result |
| --- | --- |
| Database constraints and RLS (`10_db_tests.sql`) | **74 / 74** passed |
| Edge Function unit tests | **19 / 19** passed |
| Direct-API security tests (public key, non-admin, inactive admin, admin, forged tokens, Edge Function) | **48 / 48** passed |
| Real Deno entrypoint (`index.ts`) | type-checks; served requests, saved a row, handled a duplicate, enforced CORS allow-list |
| Public form in a browser | success saves a real row; duplicate → friendly message, no second row; network failure / 429 / 500 → honest errors, never a false success; loading state, disabled inputs and single request on repeated clicks; empty form blocked client-side |
| Admin in a browser | non-admin and inactive admin denied and signed out; counts equal the database; search (incl. special characters), all filters, sorting and pagination match database queries and run server-side; details, status and notes persist after reload; a failed save shows an error and keeps the last saved value; CSV export (filtered and full, beyond one page) correct; expired session and revoked access send the user to login; logout clears the session; mobile layouts have no overflow |
| Secrets | service-role key and `service_role` do not appear in the built frontend |
| CSV | values starting with `=`, `+`, `-`, `@` are neutralised; commas, quotes and newlines escaped |

---

## 6. Known limitations / remaining steps

* **Not yet tested against a live Supabase project.** Do Step 8 and report anything odd.
* **No CAPTCHA.** Spam protection is a honeypot + server-side validation + rate limiting (10 attempts/hour per IP hash). Add Cloudflare Turnstile if abuse appears.
* **Duplicate emails** get a friendly "already on the list" message, which reveals that an email is registered. This is a UX trade-off. If enumeration worries you, return the normal success response instead.
* **After logout**, a copy of an old access token stays valid until it expires (about an hour by default). RLS still applies to it. Shorten the JWT expiry in Auth settings if needed.
* **Network failures during login** can take several seconds to report, because the Supabase client retries.
* **No password reset or admin-invite UI.** Create and reset admins from the Supabase dashboard.
* **No bulk email / WhatsApp sending**, as specified. Consent is stored (`email_marketing_consent`, `consent_recorded_at`); only email students who consented to launch updates, and keep retention/privacy obligations in mind.
* The admin session token lives in the browser's `localStorage` (Supabase's default).
