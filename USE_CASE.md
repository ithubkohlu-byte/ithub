# IT HUB Kohlu Admission System — Use Case Document

## 1. Actors

| Actor | Description |
|---|---|
| **Guest** | Anyone visiting the public site without an account. Cannot see private data. |
| **Student / Applicant** | A person who has created an account and is applying to (or already enrolled in) a course. One account covers both stages — "applicant" and "enrolled student" are just states of the same actor. |
| **Admin** | Staff member with an entry in the `admins` table. Manages the whole admission pipeline. |

A fourth, non-human actor — **the Database (Supabase/Postgres)** — enforces the rules above independently of the UI, via Row Level Security (RLS) policies. This means every use case below is safe even if a request bypasses the web app entirely (e.g. a direct API call).

---

## 2. Guest Use Cases

### UC-G1: Browse the public site
- **Goal:** Learn about IT HUB Kohlu, its courses, and current batches.
- **Flow:** Guest opens `/` → sees hero section, about, course list, current batches, testimonials (from published `home_content` and `courses`) → optionally opens `/gallery`, `/courses` for more detail.
- **Postcondition:** No data is written. Read-only, public tables only.

### UC-G2: Check a roll number slip
- **Actor:** Guest (does not need to be logged in — a physical/printed exam requires no login).
- **Flow:**
  1. Guest opens `/roll-slip`.
  2. Enters Tracking ID, CNIC, or Roll No.
  3. System calls `lookup_roll_slip(query)` (a `security definer` Postgres function — see SYSTEM_DESIGN.md).
  4. If found: shows exam center, date, time, and a downloadable/printable slip (PDF via `jspdf`).
  5. If not found: shows "not found", no student data is ever leaked in the error.

### UC-G3: Check a result
- **Flow:** Same shape as UC-G2, via `/result` and `lookup_result(query)`. Only **published** results (`is_published = true`) are ever returned — an admin must explicitly publish a result before it is public.

### UC-G4: Verify an ID card
- **Flow:** `/verify?code=...` (reached by scanning the QR code printed on a physical ID card) → calls `lookup_id_card(cnic_or_tracking_id)` → shows a green "Valid" card with the student's photo and validity date, or a red "Not valid" state. Used by front-desk/security staff to confirm a card is genuine and current.

### UC-G5: Apply for admission (becomes a Student)
- **Entry point:** `/apply`.
- **Flow (5-step wizard, `components/apply/ApplyWizard.tsx`):**
  1. **Account** — full name, email, phone, username, password (or continue with Google/Facebook/GitHub via `OAuthButtons`). Validated client-side with Zod (`lib/validations.ts:accountSchema`) before any network call.
  2. **Personal** — father's name, DOB, gender, address, city, CNIC (student + father). Validated with `personalInfoSchema`.
  3. **Academic** — Matric (required) and FSc/equivalent (required) records, plus any additional qualifications. Validated with `academicInfoSchema` plus a custom "FSc must be complete" rule.
  4. **Documents** — uploads (CNIC copy, photo, certificates) to Supabase Storage.
  5. **Enrollment** — chooses a course and an open batch.
- At every step, progress is saved to the `students` row (`onboarding_step` column) so the applicant can safely close the tab and resume later exactly where they left off.
- **Postcondition:** A `students` row exists with `application_status = 'pending'`, ready for an Admin to review.
- **Alternate flow — admissions closed:** if `home_content.admission_open = false`, the wizard stops after Step 1 (the account itself is still created) and shows a "come back later" message instead of blocking signup entirely.

---

## 3. Student Use Cases (logged in, `/dashboard`)

### UC-S1: Resume an incomplete application
- Student logs in → if `onboarding_step < 5`, is routed straight back into the wizard at the correct step.

### UC-S2: View application status
- Dashboard shows current `application_status` (pending / verified / rejected / enrolled / struck off) and any admin feedback.

### UC-S3: Download admission letter / roll slip / ID card (once available)
- Once an Admin has produced the relevant record, the student can generate/download it directly from `/dashboard`, `/roll-slip`, `/result`, `/id-card` — same public lookup functions as UC-G2–G4, just pre-filled since the student is authenticated.

### UC-S4: Submit feedback
- Student can leave feedback tied to their account (`feedback` table), visible to Admin under **Admin → Feedback**.

### UC-S5: Update account (username/password) via forgot-password / settings flows.

---

## 4. Admin Use Cases (`/admin/*`, guarded by `middleware.ts` + the `admins` table)

### UC-A1: Review applications (`/admin/students`)
- **Flow:** Search/filter by name, CNIC, Tracking ID, course, or status → paginated table (`components/ui/Pagination.tsx`) → per-row actions: **Verify**, **Reject**, **Strike off**, **Enroll** (opens `EnrollModal` to assign course + batch), **View full profile**.
- Bulk actions: **Export to CSV/Excel** of the current filtered view.

### UC-A2: Manage batches & courses (`/admin/batches`, `/admin/courses`)
- Create/edit/close batches (seats, dates); define which courses exist and their display order and description.

### UC-A3: Assign roll numbers (`/admin/roll-numbers`)
- **Flow:** Pick a student from `StudentPicker` (searches by name/Tracking ID/CNIC, no manual typing of IDs) → enter roll no., exam center/date/time → save.
- **Bulk flow:** Download a CSV pre-filled with every (or every enrolled) student's Tracking ID + CNIC → fill in roll details in a spreadsheet → re-upload → system matches each row back to a student by Tracking ID or CNIC (digits-only comparison, so dashes don't matter) and reports per-row success/failure.

### UC-A4: Publish results (`/admin/results`)
- Same picker + bulk CSV pattern as UC-A3. A result is invisible to Guests/Students (UC-G3/UC-S3) until the Admin flips **Publish** (`is_published = true`).

### UC-A5: Issue ID cards (`/admin/id-cards`)
- Issue a card (individually or "issue for all enrolled") → generates a QR code (`qrcode` package) encoding a verification link consumed by UC-G4.

### UC-A6: Manage site content (`/admin/content`, `/admin/site-pages`, `/admin/gallery`)
- Edit homepage hero/about text, institute name, developer credit, contact info; manage gallery images; manage static pages.

### UC-A7: Review feedback & shortlist (`/admin/feedback`, `/admin/shortlist`)

### UC-A8: Manage other admins (`/admin/settings` → `app/api/admin/admins/route.ts`)
- Add/remove admin users. Uses a server-side API route with the Supabase **service role** key (never exposed to the browser) because granting the `admin` role is a privileged operation that must not be possible from client-side code alone.

### UC-A9: Reset a student's password (`app/api/admin/reset-password/route.ts`)
- Admin-only server route; lets an Admin reset a student's login without knowing their current password (support scenario).

---

## 5. Cross-cutting flow: Authentication & Authorization (text flow diagram)

```
Guest
  │
  ├─ visits public route (/, /courses, /gallery, /roll-slip, /result, /verify)
  │     → served with NO auth check (middleware.ts only guards /dashboard and /admin)
  │
  ├─ visits /login or /apply
  │     → AuthCard / ApplyWizard → supabase.auth.signInWithPassword | signUp | OAuth
  │        │
  │        ├─ success → Supabase issues a session (JWT in an HttpOnly cookie via @supabase/ssr)
  │        │      │
  │        │      ├─ row exists in `admins` table for this user? ──► redirect /admin
  │        │      └─ else                                          ──► redirect /dashboard
  │        │
  │        └─ failure → inline error shown, no redirect
  │
  └─ visits /dashboard or /admin/* directly (no session)
        → middleware.ts intercepts BEFORE the page renders
        → no user            → redirect /login
        → user, but not in `admins` (for /admin/*) → redirect /
```

Every protected data operation is *also* enforced at the database layer via RLS policies (e.g. a student can only `select`/`update` their own row; only rows where `auth.uid()` is present in `admins` can write to `students`, `results`, etc.). The middleware redirect is a UX convenience — RLS is what actually makes the system secure even if the UI is bypassed. See **SYSTEM_DESIGN.md → Authentication & Authorization Flow** for the full sequence diagram.
