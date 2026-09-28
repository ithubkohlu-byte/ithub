# IT HUB KOHLU Institute — Admission System

Next.js 14 (App Router) + TypeScript + Tailwind + Supabase.

## 1. Install

```bash
npm install
cp .env.local.example .env.local
```

Fill `.env.local` with your Supabase project URL, anon key, and **service role key**
(Project Settings → API in the Supabase dashboard). The service role key is only
used server-side in `app/api/admin/reset-password/route.ts` — never expose it to the client.

## 2. Database

Open the Supabase SQL Editor and run `sql/schema.sql` once. It creates every table,
enum, trigger (tracking-ID generation, seat auto-increment/auto-close), storage bucket,
and RLS policy described in the brief.

## 3. Create your first admin

Supabase Auth doesn't have "roles" out of the box, so this project uses an `admins`
table: any `auth.users` row referenced there is treated as an admin anywhere in the app.

1. In Supabase Dashboard → Authentication → Users, create a user with an email + password.
2. Copy that user's UUID.
3. Run in the SQL Editor:
   ```sql
   insert into public.admins (id, full_name) values ('paste-uuid-here', 'Super Admin');
   ```
4. Log in at `/login` with that email/password — you'll be routed to `/admin` automatically.

## 4. Auth settings (important)

The 5-step `/apply` flow calls `supabase.auth.signUp()` and immediately writes to the
`students` table in the same step, which requires an active session. In **Supabase
Dashboard → Authentication → Providers → Email**, either:

- Turn **off** "Confirm email" so `signUp()` returns a live session instantly (recommended
  for a smooth one-sitting admission flow), or
- Leave it on and add a "check your inbox, then come back and log in to resume your
  application" message — the current code assumes the former.

## 5. Enable "Continue with Google / Facebook / GitHub" (optional)

In **Supabase Dashboard → Authentication → Providers**, turn on Google, Facebook and/or
GitHub and fill in each provider's own Client ID/Secret. No new env vars are needed here —
`app/auth/callback/route.ts` handles the redirect back into the app. First-time sign-ins
via a provider are sent to `/apply?step=username` to pick a username before anything else.

## 6. Run

```bash
npm run dev
```

## What's included

- **Landing page** (`/`) — CMS-driven hero/about/why-us/contact, live ticker for
  open+announced batches, courses grid, batches grid with live seat counts, gallery
  with batch filter + lightbox, conditional "Roll No Slip" nav link.
- **`/apply`** — 5-step wizard (Account → Personal → Academic → Documents → Enrollment)
  saving to Supabase at every step, 6-doc upload to a private storage bucket, auto
  tracking-ID (`ITHUB-YYYY-1001…`), jsPDF admission letter with embedded QR code. Step 1
  now also has the student choose a **username** (e.g. `salam776`, unique, checked live)
  and offers **Continue with Google / Facebook / GitHub**.
- **`/login`, `/forgot-password`, `/dashboard`** — student auth, profile, per-document
  status + admin comments, letter re-download, roll slip when assigned. Students can log
  in with either their **username or email**, or with Google/Facebook/GitHub.
- **`/roll-slip`** — public search by Tracking ID / CNIC / Roll No.
- **`/admin`** (hidden, no public link, guarded by `middleware.ts` + the `admins` table) —
  dashboard cards, batch CRUD with an announce toggle and auto-close-at-50 trigger,
  student data bank with search/filter/Excel export, per-student document
  verify/reject + final approve/reject + admin password reset, roll-number manual
  assign + CSV bulk upload, home-content CMS, gallery CMS, and self-service
  email/password settings.

## Known trade-offs (flagged for a from-scratch build like this)

- **Styling**: Tailwind classes are written throughout, but the project has not been
  run through `npm install && npm run build` in this environment (no network access
  here) — do that first and fix any incidental type/import errors before deploying.
- **Storage security**: `student_docs` is a private bucket; the RLS policy assumes each
  file is uploaded under a `{student_uid}/...` path, which the apply wizard follows.
- **Excel export** covers the fields named in the brief; extend `exportExcel()` in
  `app/admin/students/page.tsx` for more columns.
- **Email templates / SMTP** (confirmation, password reset) use Supabase's default —
  customize them in Supabase Dashboard → Authentication → Email Templates.

## Update — Sep 2026 (name/logo, QR verify, CSV, dashboard tabs, dev credit)

If you're upgrading an existing Supabase project, re-run `sql/schema.sql` — it's
additive (`create table if not exists`, `add column if not exists`), so it's safe to
run again on top of your current database. New pieces:

- **Institute name & logo everywhere** — `home_content.institute_name` (default
  "IT HUB Kohlu") now drives the navbar, footer, admin sidebar, browser tab title,
  the printed admission letter and the roll no. slip. Edit it from
  **Admin → Home Content → Branding**, alongside the existing logo uploader.
- **QR verification** — the QR code on both the admission letter and the roll slip now
  encodes a link to `/verify?tid=<tracking id>` instead of raw JSON. That public page
  calls a new `verify_record()` Postgres function (security-definer, so it only ever
  returns name/status/course/batch/roll info — never CNIC, phone, or address) and shows
  a clear "Genuine Record" or "Not Verified" result. Scanning the code from a phone
  opens this page directly.
- **CSV export** — `Admin → Students` now has both "Export to CSV" and "Export to
  Excel" buttons (same columns).
- **Student dashboard tabs** — the dashboard is now tabbed: **My Application**, **Roll
  Number**, **Help**, **Feedback** are always shown. Admin can add further tabs (plain
  title + text) from **Admin → Dashboard Tabs**; they appear on every student's
  dashboard. Students submit feedback (rating + message) from the **Feedback** tab;
  admin reads/deletes it from **Admin → Feedback**.
- **Developer credit** — `home_content.developer_name` (default "Abdul Salam") is shown
  as "Developed by …" in the site footer, editable from the same Branding section.

## Update — Student ID Cards

If you're upgrading an existing project, re-run `sql/schema.sql` again (it's additive,
same as before) to get the new `id_cards` table, `home_content.id_card_terms` column,
and the `lookup_id_card()` / `id_cards_issued_count()` functions.

- **Admin → ID Cards** (`/admin/id-cards`) — issue a printable ID card for any student
  whose `application_status` is `enrolled`. Issue one at a time (with optional
  class/section label, emergency contact, blood group, and a validity date), or use
  **"Issue Cards for All Enrolled Students"** to bulk-issue in one click, then fine-tune
  each row inline in the table below. **Revoke** deletes a card so the student can no
  longer download it.
- **Public `/id-card` page** — a student enters their CNIC. If (and only if) they are
  `enrolled` **and** the admin has issued them a card, their ID card is shown (front +
  back, matching a standard CR80 card layout) with **Print** and **Download PDF**
  buttons. The PDF is sized to the real card (3.375" × 2.125") with a dashed cut guide,
  ready to print on card stock. Anonymous CNIC lookup goes through a new
  `lookup_id_card()` security-definer Postgres function — same safe pattern as
  `verify_record()` — so RLS on `public.students` is never widened for public search.
- The card's back includes a QR code linking back to `/id-card?cnic=...`, and a Terms &
  Conditions block editable from **Admin → Home Content** (`id_card_terms`).
- A "ID Card" link appears in the public navbar automatically once at least one card has
  been issued (same pattern as the existing "Roll Slip" link).
