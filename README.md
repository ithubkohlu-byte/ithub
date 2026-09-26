# IT HUB Admission System

Premium Next.js 14 + Supabase admission portal for IT HUB Institute.
Contact: 03324455006 | ithubkohlu@gmail.com

## Setup
1. `npm install`
2. Create a Supabase project, run `supabase.sql` in the SQL editor (also creates `student_docs` private bucket and `gallery_images` public bucket).
3. Copy `.env.example` to `.env.local` and fill in your Supabase keys.
4. Create your first admin: sign up a user (Supabase Studio > Authentication > Add user), then run
   `insert into admins (id) values ('<user-id>');` in the SQL editor.
5. `npm run dev`

## Structure
- `/` landing page
- `/apply` 5-step admission wizard
- `/login`, `/forgot-password`, `/dashboard` student panel
- `/roll-slip` public roll number slip lookup
- `/admin/*` hidden super-admin panel (protected by middleware + RLS)
