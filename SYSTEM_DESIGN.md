# IT HUB Kohlu Admission System — System Design

## 1. Three-Tier Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  TIER 1 — PRESENTATION (Client)                                       │
│  Browser running React (Next.js App Router, "use client" components)  │
│  • Renders UI, holds local form state                                 │
│  • Client-side validation FIRST (Zod — lib/validations.ts) so a bad   │
│    value never reaches the network                                    │
│  • Talks to Tier 2 in two ways:                                       │
│      (a) directly to Supabase, via the anon key (@supabase/supabase-js)│
│      (b) to this app's own Next.js API routes, for privileged actions │
└───────────────────────────────┬────────────────────────────────────┬─┘
                                 │ (a) anon-key calls                 │ (b) same-origin fetch
                                 ▼                                    ▼
┌────────────────────────────────────────────┐   ┌─────────────────────────────────┐
│ TIER 2a — Supabase (BaaS)                   │   │ TIER 2b — Next.js Server         │
│ • PostgREST: auto-generated REST API over   │   │  (Vercel serverless functions)   │
│   Postgres tables, gated by RLS             │   │ • middleware.ts — route guarding │
│ • GoTrue: authentication (email/password,   │   │ • app/api/admin/* — privileged   │
│   Google/Facebook/GitHub OAuth), issues JWT │   │   operations using the SERVICE   │
│ • Storage: file uploads (docs, photos)      │   │   ROLE key (never sent to        │
│ • Postgres functions (RPC) for search       │   │   browser)                       │
│   (lookup_result, lookup_roll_slip, ...)    │   │ • Server Components (app/admin/  │
└───────────────────────────────┬────────────┘   │   page.tsx) fetch data server-   │
                                 │                 │   side before HTML is sent       │
                                 │                 └─────────────────┬─────────────────┘
                                 ▼                                   │
┌──────────────────────────────────────────────────────────────────▼──┐
│  TIER 3 — DATA (Postgres, managed by Supabase)                       │
│  • Tables (see ER diagram below) + RLS policies on every table        │
│  • security definer functions for controlled, anonymous-safe reads    │
│    (e.g. result lookup must NOT require exposing the whole table)     │
│  • Storage buckets (student_docs — private; gallery — public)         │
└────────────────────────────────────────────────────────────────────┘
```

**Why two paths in Tier 2?** Most reads/writes (a student updating their own profile, an admin editing a course) are safe to do directly against Supabase from the browser, because RLS enforces "who can touch which row" at the database level regardless of what the client claims. A small number of operations are inherently privileged in a way RLS alone can't express cleanly — e.g. *granting someone the admin role*, or *resetting another user's password* — those go through `app/api/admin/*`, which runs on the server and uses the Supabase **service role** key (bypasses RLS entirely, so it must never reach client-side code).

---

## 2. Database ER Diagram (text form)

```
 admins                     students                        courses
┌──────────────┐  1     N  ┌───────────────────────┐  N     N  ┌────────────────┐
│ id (PK, FK→   │◄─────────│ id (PK, FK→auth.users) │──────────►│ id (PK)         │
│  auth.users)  │  (an     │ tracking_id  (unique)   │  via      │ name (unique)   │
│ full_name     │  admin   │ username     (unique)   │ enrollments│ description     │
└──────────────┘  reviews  │ email        (unique)   │           │ display_order   │
                   many    │ student_cnic            │           └────────┬────────┘
                   students│ father_cnic              │                    │ N
                            │ auth_provider            │                    │
                            │ application_status  ENUM │                    │ 1
                            │  (pending|verified|      │           ┌────────▼────────┐
                            │   rejected|enrolled|     │           │ batches         │
                            │   struck_off)            │  N     1  │ id (PK)         │
                            │ onboarding_step          │◄──────────│ batch_name       │
                            └──────────┬───────────────┘  via      │ seats_total      │
                                       │ 1                enrollments│ seats_filled   │
                    ┌──────────────────┼──────────────────┐        │ start_date/end  │
                    │ N                │ N                │ N      └────────┬────────┘
           ┌────────▼────────┐ ┌───────▼────────┐ ┌───────▼─────────┐       │ N
           │ enrollments     │ │ documents      │ │ roll_numbers    │       │
           │ id (PK)         │ │ id (PK)        │ │ id (PK)         │  ┌────▼─────────────┐
           │ student_id (FK) │ │ student_id(FK) │ │ student_id (FK) │  │ batch_courses      │
           │ batch_id   (FK) │ │ doc_type       │ │ roll_no (unique)│  │ (join: which       │
           │ course_name     │ │ file_url       │ │ exam_center     │  │  courses run in    │
           └─────────────────┘ └────────────────┘ │ exam_date/time  │  │  which batch)      │
                    │ 1                            └─────────────────┘  └────────────────────┘
                    │
           ┌────────▼────────┐        ┌──────────────────┐      ┌───────────────────┐
           │ results         │        │ id_cards          │      │ additional_        │
           │ id (PK)         │        │ id (PK)            │      │ qualifications     │
           │ student_id (FK) │        │ student_id (FK)    │      │ id (PK)             │
           │ title           │        │ issue_date          │      │ student_id (FK)     │
           │ result_status   │        │ valid_until          │      │ qualification_name  │
           │ marks_obtained  │        │ card_no (unique)     │      │ institute_name      │
           │ marks_total     │        └────────────────────┘      └────────────────────┘
           │ is_published    │
           └─────────────────┘

 home_content (singleton, id=1)      site_pages            gallery            feedback
┌───────────────────────┐          ┌───────────────┐      ┌───────────┐      ┌─────────────────┐
│ institute_name         │          │ slug (unique)  │      │ image_url │      │ student_id (FK)   │
│ developer_name          │          │ title           │      │ caption   │      │ message            │
│ hero_title, ...          │         │ body            │      └───────────┘      │ student_name (auto)│
└───────────────────────┘          └───────────────┘                           └─────────────────┘

 dashboard_tabs
┌───────────────────────┐
│ (which optional tabs   │   auth.users  ← managed entirely by Supabase GoTrue (not in `public` schema).
│  show on /dashboard)   │   `students.id` and `admins.id` are both foreign keys to auth.users.id —
└───────────────────────┘   one Supabase Auth identity, two possible roles (student profile / admin flag).
```

**Key design decisions:**
- `students.id` **is** `auth.users.id` (not a separate surrogate key) — a student's application row and their login identity are the same row, simplifying every RLS policy to `id = auth.uid()`.
- `application_status` is a Postgres `enum`, not a free-text column — the database itself rejects an invalid status, independent of the app.
- `is_published` on `results` is the single gate between "admin has entered a result" and "the public can see it" — this is enforced inside the `lookup_result()` function, not just hidden in the UI, so there's no way to fetch an unpublished result even by calling the API directly.
- `security definer` functions (`lookup_result`, `lookup_roll_slip`, `lookup_id_card`, `results_published_count`, `is_username_available`, `get_email_by_username`) let an anonymous Guest look up *their own* record by something only they'd know (CNIC / Tracking ID / Roll No.) without granting the anon role blanket `select` access to the `students` table.

---

## 3. API Routes Structure

This app is mostly **serverless-via-Supabase** (Tier 2a in the diagram) rather than a traditional REST API — the client talks to Supabase directly for almost everything, governed by RLS. The Next.js server (Tier 2b) only exists for the handful of operations that must run with elevated privilege:

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/admin/admins` | `POST` | Grant admin role to a user (by email) | Admin session required (checked server-side before using the service key) |
| `/api/admin/admins` | `DELETE` | Revoke admin role | Admin session required |
| `/api/admin/reset-password` | `POST` | Force-reset a student's password | Admin session required |

(The current list of admins is read directly from Supabase — `select * from admins` — under RLS, since that's a safe, non-privileged read for an already-authenticated admin; only *granting/revoking* the role needs the service-role route.)

**Supabase RPC "routes"** (called as `supabase.rpc("name", {...})` from the client — effectively the public API surface for anonymous lookups):

| Function | Purpose | Who can call |
|---|---|---|
| `lookup_result(p_query)` | Find a student's **published** results by Tracking ID/CNIC | `anon`, `authenticated` |
| `lookup_roll_slip(p_query)` | Find roll-slip details by Roll No./Tracking ID/CNIC | `anon`, `authenticated` |
| `lookup_id_card(p_cnic)` | Verify an ID card by CNIC/Tracking ID | `anon`, `authenticated` |
| `results_published_count()` | Count of published results (drives whether the "Results" nav link shows) | `anon`, `authenticated` |
| `is_username_available(p_username)` | Live username-availability check during signup | `anon`, `authenticated` |
| `get_email_by_username(p_username)` | Resolve a username to an email so username-login can call `signInWithPassword` | `anon`, `authenticated` |

**Standard PostgREST table routes** (auto-generated by Supabase, not hand-written): every table is reachable at `https://<project>.supabase.co/rest/v1/<table>`, but RLS decides what each caller can actually see/change — e.g. `GET /rest/v1/students` as an anonymous user returns zero rows, as a logged-in student returns exactly their own row, as an admin returns all rows.

---

## 4. Authentication Flow (sequence)

```
Browser                     Supabase Auth (GoTrue)         Postgres (RLS)            Next.js Server
   │                                │                            │                          │
   │ 1. signInWithPassword /        │                            │                          │
   │    signUp / OAuth redirect     │                            │                          │
   ├───────────────────────────────►│                            │                          │
   │                                │ 2. verifies credentials,    │                          │
   │                                │    issues JWT (access +     │                          │
   │                                │    refresh token)            │                          │
   │◄───────────────────────────────┤                            │                          │
   │ 3. @supabase/ssr stores the    │                            │                          │
   │    session in HttpOnly cookies │                            │                          │
   │                                │                            │                          │
   │ 4. any subsequent request to   │                            │                          │
   │    Supabase attaches the JWT   │                            │                          │
   │    automatically               │                            │                          │
   ├────────────────────────────────┼───────────────────────────►│                          │
   │                                │                            │ 5. RLS policy evaluates  │
   │                                │                            │    auth.uid() against the│
   │                                │                            │    row being accessed     │
   │◄───────────────────────────────┼────────────────────────────┤                          │
   │                                │                            │                          │
   │ 6. navigates to /admin/* or    │                            │                          │
   │    /dashboard/*                │                            │                          │
   ├────────────────────────────────┼────────────────────────────┼─────────────────────────►│
   │                                │                            │                          │ 7. middleware.ts runs
   │                                │                            │                          │    BEFORE the page:
   │                                │                            │                          │    reads the session
   │                                │                            │                          │    cookie, calls
   │                                │                            │                          │    supabase.auth.getUser()
   │                                │                            │◄─────────────────────────┤ 8. for /admin/*, also
   │                                │                            │                            queries `admins` table
   │◄───────────────────────────────┼────────────────────────────┼──────────────────────────┤ 9a. no session → redirect /login
   │                                │                            │                            9b. session but not admin → redirect /
   │                                │                            │                            9c. authorized → render page
```

**Token refresh:** `@supabase/ssr` transparently refreshes the access token using the refresh token before it expires, on every server request that goes through `middleware.ts` — the client never has to manually re-authenticate during a normal session.

**Two independent layers, by design:** `middleware.ts` is a *routing* guard (fast redirect, good UX, avoids flashing protected UI). RLS is the *data* guard (the actual security boundary). A request that somehow skipped the middleware (e.g. a direct `fetch` to Supabase from devtools) would still be blocked at the database layer — the app has no privileged path that trusts the client.

---

## 5. Non-functional notes

- **Hosting:** Vercel (Next.js), auto-deploys on push to `main`.
- **Data layer:** Supabase (managed Postgres + Auth + Storage), single project, `public` schema.
- **State management:** No global state library — each page/component owns its Supabase queries via `useEffect`/Server Components. Kept deliberately simple for a codebase of this size; would be revisited (e.g. React Query) if the admin panel's data-fetching duplication grows further.
- **File storage:** Supabase Storage, two buckets — `student_docs` (private, RLS-gated) and `gallery` (public, read-only to anon).
