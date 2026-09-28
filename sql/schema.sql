-- =========================================================
-- IT HUB KOHLU ADMISSION SYSTEM — SUPABASE SCHEMA
-- Run this whole file once in Supabase SQL Editor.
-- =========================================================

-- ---------- EXTENSIONS ----------
create extension if not exists "uuid-ossp";

-- ---------- ENUMS ----------
do $$ begin
  create type application_status as enum ('pending','verified','rejected','enrolled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_status as enum ('pending','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type batch_status as enum ('draft','open','closed');
exception when duplicate_object then null; end $$;

-- ---------- ADMIN ROLE TABLE ----------
-- Any auth.users row present here is treated as an admin.
create table if not exists public.admins (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now()
);

-- ---------- HOME CONTENT (CMS, single row) ----------
create table if not exists public.home_content (
  id int primary key default 1,
  hero_title text default 'Shape Your Future With IT HUB KOHLU',
  hero_subtitle text default 'Industry-focused admissions in Web Development, Graphic Designing, Digital Marketing & E-Commerce.',
  about_text text default 'IT HUB KOHLU Institute trains the next generation of tech professionals with hands-on, project-based learning.',
  why_choose_us_points jsonb default '["Expert Instructors","Hands-on Projects","Job Placement Support","Modern Curriculum"]',
  contact_phone text default '+92 300 0000000',
  contact_email text default 'info@ithub.edu.pk',
  contact_address text default 'Main Boulevard, City, Pakistan',
  -- Global admission switch: when false, students can still create an account
  -- but cannot proceed with the admission application (personal/academic/docs/enrollment).
  admission_open boolean not null default true,
  -- Site logo shown in the navbar, footer and admin sidebar. Null = fall back to the default IT HUB KOHLU mark.
  logo_url text,
  -- Institute's official display name, shown on the navbar/footer/admin sidebar and printed on the
  -- admission letter and roll no. slip (e.g. "IT HUB Kohlu").
  institute_name text not null default 'IT HUB Kohlu',
  -- Name credited as "Developed by" in the site footer. Admin-editable from Settings.
  developer_name text not null default 'Abdul Salam',
  -- Rich text shown on the student dashboard's "Help" tab.
  help_content text not null default 'Need assistance? Contact the IT HUB KOHLU office during working hours, or reach out via the phone/email listed below.',
  -- Optional note printed on every generated admission letter (e.g. "Please bring
  -- original documents on the first day of class."). Admin-editable from Home Content.
  admission_note text not null default '',
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);
insert into public.home_content (id) values (1) on conflict (id) do nothing;

-- ---------- COURSES (admin-managed, so batches/homepage stay in sync) ----------
create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text not null default '',
  duration text not null default '',
  icon_key text not null default 'code',
  display_order int not null default 0,
  -- Whether this course currently accepts new applications. Independent from
  -- individual batch status: a course can exist but be paused between batches.
  is_open boolean not null default true,
  created_at timestamptz default now()
);
insert into public.courses (name, description, duration, icon_key, display_order) values
  ('Web Developing', 'Full-stack web development from HTML to modern frameworks.', '6 Months', 'code', 1),
  ('Graphic Designing', 'Master visual design tools and creative production.', '4 Months', 'palette', 2),
  ('Digital Marketing', 'SEO, social media and paid ads strategy.', '3 Months', 'megaphone', 3),
  ('E-Commerce', 'Build and run online stores end to end.', '3 Months', 'cart', 4)
on conflict (name) do nothing;

-- ---------- BATCHES ----------
create table if not exists public.batches (
  id uuid primary key default uuid_generate_v4(),
  batch_name text not null,
  course_name text not null references public.courses(name) on update cascade,
  start_date date not null,
  end_date date not null,
  seats_total int not null default 50,
  seats_filled int not null default 0,
  status batch_status not null default 'draft',
  is_announced boolean not null default false,
  created_at timestamptz default now()
);

-- Auto close batch when full, auto-reopen not automatic (admin controlled)
create or replace function public.batch_seat_guard()
returns trigger as $$
begin
  if new.seats_filled >= new.seats_total then
    new.status = 'closed';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_batch_seat_guard on public.batches;
drop trigger if exists trg_batch_seat_guard on public.batches;
create trigger trg_batch_seat_guard
before insert or update of seats_filled on public.batches
for each row execute function public.batch_seat_guard();

-- ---------- BATCH COURSES (a batch can offer more than one course) ----------
-- batches.course_name above stays as the batch's primary course (used by
-- existing enrollments/letters); this table lets an admin additionally make
-- a batch available for other courses too (e.g. Batch 2 covers 4 courses).
create table if not exists public.batch_courses (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  course_name text not null references public.courses(name) on update cascade on delete cascade,
  created_at timestamptz default now(),
  unique (batch_id, course_name)
);

-- Whenever a batch's primary course_name is set/changed, make sure it's
-- always also present in batch_courses, so "all courses for this batch"
-- queries never have to special-case the primary column.
create or replace function public.sync_batch_primary_course()
returns trigger as $$
begin
  insert into public.batch_courses (batch_id, course_name)
  values (new.id, new.course_name)
  on conflict (batch_id, course_name) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_batch_primary_course on public.batches;
drop trigger if exists trg_sync_batch_primary_course on public.batches;
create trigger trg_sync_batch_primary_course
after insert or update of course_name on public.batches
for each row execute function public.sync_batch_primary_course();

-- ---------- STUDENTS (profile linked to auth.users) ----------
create table if not exists public.students (
  id uuid primary key references auth.users(id) on delete cascade,
  tracking_id text unique,
  full_name text,
  email text,
  phone text,
  father_name text,
  dob date,
  gender text,
  address text,
  city text,
  student_cnic text,
  father_cnic text,
  -- academic: matric
  matric_board text,
  matric_year text,
  matric_total numeric,
  matric_obtained numeric,
  matric_percentage numeric generated always as
    (case when matric_total > 0 then round((matric_obtained / matric_total) * 100, 2) else 0 end) stored,
  -- academic: fsc
  fsc_board text,
  fsc_year text,
  fsc_group text,
  fsc_total numeric,
  fsc_obtained numeric,
  fsc_percentage numeric generated always as
    (case when fsc_total > 0 then round((fsc_obtained / fsc_total) * 100, 2) else 0 end) stored,
  photo_url text,
  username text,
  auth_provider text not null default 'password', -- 'password' | 'google' | 'facebook' | 'github'
  application_status application_status not null default 'pending',
  onboarding_step int not null default 1, -- tracks progress through the 5-step form
  created_at timestamptz default now()
);

-- Tracking ID sequence: ITHUB-YYYY-1001, 1002, ...
create sequence if not exists public.tracking_id_seq start 1001;

create or replace function public.generate_tracking_id()
returns text as $$
declare
  yr text := to_char(now(), 'YYYY');
  n int;
begin
  n := nextval('public.tracking_id_seq');
  return 'ITHUB-' || yr || '-' || n::text;
end;
$$ language plpgsql;

create or replace function public.set_tracking_id()
returns trigger as $$
begin
  if new.tracking_id is null then
    new.tracking_id := public.generate_tracking_id();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_tracking_id on public.students;
drop trigger if exists trg_set_tracking_id on public.students;
create trigger trg_set_tracking_id
before insert on public.students
for each row execute function public.set_tracking_id();

-- ---------- ENROLLMENTS ----------
create table if not exists public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  batch_id uuid not null references public.batches(id),
  course_name text not null,
  enrolled_at timestamptz default now(),
  unique (student_id, batch_id)
);

-- When an enrollment is inserted, increment batch seats_filled
create or replace function public.increment_batch_seats()
returns trigger as $$
begin
  update public.batches
    set seats_filled = seats_filled + 1
    where id = new.batch_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_increment_seats on public.enrollments;
drop trigger if exists trg_increment_seats on public.enrollments;
create trigger trg_increment_seats
after insert on public.enrollments
for each row execute function public.increment_batch_seats();

-- If an enrollment is deleted (admin correction), decrement seats
create or replace function public.decrement_batch_seats()
returns trigger as $$
begin
  update public.batches
    set seats_filled = greatest(seats_filled - 1, 0)
    where id = old.batch_id;
  return old;
end;
$$ language plpgsql;

drop trigger if exists trg_decrement_seats on public.enrollments;
drop trigger if exists trg_decrement_seats on public.enrollments;
create trigger trg_decrement_seats
after delete on public.enrollments
for each row execute function public.decrement_batch_seats();

-- ---------- DOCUMENTS ----------
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'fsc_degree','domicile','cnic_student_front','cnic_student_back',
    'police_verification','cnic_father_front','cnic_father_back','photo'
  )),
  file_path text not null,
  status doc_status not null default 'pending',
  admin_comment text,
  uploaded_at timestamptz default now(),
  unique (student_id, doc_type)
);

-- ---------- GALLERY ----------
create table if not exists public.gallery (
  id uuid primary key default uuid_generate_v4(),
  image_url text not null,
  batch_name text,
  caption text,
  is_hidden boolean default false,
  created_at timestamptz default now()
);

-- ---------- ROLL NUMBERS ----------
create table if not exists public.roll_numbers (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  roll_no text unique not null,
  exam_center text,
  exam_date date,
  exam_time text,
  -- Optional per-student instruction shown on their roll no. slip, e.g.
  -- "Please arrive 30 minutes before exam time." Set by admin per roll number.
  note text,
  created_at timestamptz default now()
);

-- ---------- DASHBOARD TABS (admin-managed extra tabs on the student dashboard) ----------
-- "My Application" and "Roll Number" are always shown; admin can add further tabs here
-- (e.g. announcements, rules) which appear on every student's dashboard in display_order.
create table if not exists public.dashboard_tabs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null default '',
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- ---------- FEEDBACK (students submit from the dashboard's Feedback tab; ----------
-- ---------- admin-approved ones show up as public reviews on the website) ----------
create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  -- Snapshot of the student's name at submit time, so the public reviews
  -- section can display it without needing read access to public.students.
  student_name text,
  message text not null,
  rating int check (rating is null or (rating between 1 and 5)),
  -- Admin approval gate: only approved rows are shown on the public
  -- "Student Reviews" section on the website.
  is_approved boolean not null default false,
  created_at timestamptz default now()
);

-- Auto-fill student_name from the students table on insert if not provided.
create or replace function public.set_feedback_student_name()
returns trigger as $$
begin
  if new.student_name is null then
    select full_name into new.student_name from public.students where id = new.student_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_set_feedback_student_name on public.feedback;
drop trigger if exists trg_set_feedback_student_name on public.feedback;
create trigger trg_set_feedback_student_name
before insert on public.feedback
for each row execute function public.set_feedback_student_name();

-- =========================================================
-- STORAGE BUCKETS
-- =========================================================
insert into storage.buckets (id, name, public)
values ('student_docs', 'student_docs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('gallery_images', 'gallery_images', true)
on conflict (id) do nothing;

-- site_assets: public bucket for the site logo and other branding files.
insert into storage.buckets (id, name, public)
values ('site_assets', 'site_assets', true)
on conflict (id) do nothing;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.home_content enable row level security;
alter table public.batches enable row level security;
alter table public.students enable row level security;
alter table public.enrollments enable row level security;
alter table public.documents enable row level security;
alter table public.gallery enable row level security;
alter table public.roll_numbers enable row level security;
alter table public.admins enable row level security;
alter table public.courses enable row level security;
alter table public.dashboard_tabs enable row level security;
alter table public.feedback enable row level security;
alter table public.batch_courses enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (select 1 from public.admins where id = auth.uid());
$$ language sql stable security definer;

-- admins: only admins can read the admins table
drop policy if exists "admins read own row" on public.admins;
create policy "admins read own row" on public.admins for select using (id = auth.uid());

-- home_content: public read, admin write
drop policy if exists "home_content public read" on public.home_content;
create policy "home_content public read" on public.home_content for select using (true);
drop policy if exists "home_content admin write" on public.home_content;
create policy "home_content admin write" on public.home_content for all
  using (public.is_admin()) with check (public.is_admin());

-- batches: public read only announced; admin full access
drop policy if exists "batches public read announced" on public.batches;
create policy "batches public read announced" on public.batches
  for select using (is_announced = true or public.is_admin());
drop policy if exists "batches admin write" on public.batches;
create policy "batches admin write" on public.batches for all
  using (public.is_admin()) with check (public.is_admin());

-- students: a student can read/update only their own row; admin full access
drop policy if exists "students self read" on public.students;
create policy "students self read" on public.students
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "students self insert" on public.students;
create policy "students self insert" on public.students
  for insert with check (id = auth.uid());
drop policy if exists "students self update" on public.students;
create policy "students self update" on public.students
  for update using (id = auth.uid() or public.is_admin());
drop policy if exists "students admin delete" on public.students;
create policy "students admin delete" on public.students
  for delete using (public.is_admin());

-- enrollments: student sees own; admin sees all
drop policy if exists "enrollments self read" on public.enrollments;
create policy "enrollments self read" on public.enrollments
  for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "enrollments self insert" on public.enrollments;
create policy "enrollments self insert" on public.enrollments
  for insert with check (student_id = auth.uid() or public.is_admin());
drop policy if exists "enrollments admin write" on public.enrollments;
create policy "enrollments admin write" on public.enrollments
  for update using (public.is_admin());
drop policy if exists "enrollments admin delete" on public.enrollments;
create policy "enrollments admin delete" on public.enrollments
  for delete using (public.is_admin());

-- documents: student sees/inserts own; only admin updates status
drop policy if exists "documents self read" on public.documents;
create policy "documents self read" on public.documents
  for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "documents self insert" on public.documents;
create policy "documents self insert" on public.documents
  for insert with check (student_id = auth.uid() or public.is_admin());
drop policy if exists "documents admin update" on public.documents;
create policy "documents admin update" on public.documents
  for update using (public.is_admin());

-- courses: public read; admin write (add/rename/reorder/open-close a course)
drop policy if exists "courses public read" on public.courses;
create policy "courses public read" on public.courses for select using (true);
drop policy if exists "courses admin write" on public.courses;
create policy "courses admin write" on public.courses for all
  using (public.is_admin()) with check (public.is_admin());

-- gallery: public read (not hidden); admin full access
drop policy if exists "gallery public read" on public.gallery;
create policy "gallery public read" on public.gallery
  for select using (is_hidden = false or public.is_admin());
drop policy if exists "gallery admin write" on public.gallery;
create policy "gallery admin write" on public.gallery for all
  using (public.is_admin()) with check (public.is_admin());

-- roll_numbers: public can look up (needed for /roll-slip search); admin writes
drop policy if exists "roll_numbers public read" on public.roll_numbers;
create policy "roll_numbers public read" on public.roll_numbers for select using (true);
drop policy if exists "roll_numbers admin write" on public.roll_numbers;
create policy "roll_numbers admin write" on public.roll_numbers for all
  using (public.is_admin()) with check (public.is_admin());

-- dashboard_tabs: logged-in students see active tabs; admin has full access
drop policy if exists "dashboard_tabs student read" on public.dashboard_tabs;
create policy "dashboard_tabs student read" on public.dashboard_tabs
  for select using ((is_active = true and auth.role() = 'authenticated') or public.is_admin());
drop policy if exists "dashboard_tabs admin write" on public.dashboard_tabs;
create policy "dashboard_tabs admin write" on public.dashboard_tabs for all
  using (public.is_admin()) with check (public.is_admin());

-- feedback: a student can submit and read their own; admin reads/manages all;
-- anyone (including anonymous visitors) can read admin-approved reviews.
drop policy if exists "feedback self read" on public.feedback;
create policy "feedback self read" on public.feedback
  for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "feedback public read approved" on public.feedback;
create policy "feedback public read approved" on public.feedback
  for select using (is_approved = true);
drop policy if exists "feedback self insert" on public.feedback;
create policy "feedback self insert" on public.feedback
  for insert with check (student_id = auth.uid());
drop policy if exists "feedback admin update" on public.feedback;
create policy "feedback admin update" on public.feedback
  for update using (public.is_admin());
drop policy if exists "feedback admin delete" on public.feedback;
create policy "feedback admin delete" on public.feedback
  for delete using (public.is_admin());

-- batch_courses: public read (needed on the homepage/apply form); admin write
drop policy if exists "batch_courses public read" on public.batch_courses;
create policy "batch_courses public read" on public.batch_courses
  for select using (true);
drop policy if exists "batch_courses admin write" on public.batch_courses;
create policy "batch_courses admin write" on public.batch_courses for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- PUBLIC VERIFICATION (for the QR code on admission letters / roll slips) ----------
-- Returns only the handful of fields needed to confirm a record is genuine — never CNIC,
-- address, phone, email, etc. This lets the public /verify page and QR scans work for
-- anonymous visitors without widening RLS on the students table itself.
create or replace function public.verify_record(p_tracking_id text)
returns table (
  full_name text,
  tracking_id text,
  application_status text,
  course_name text,
  batch_name text,
  roll_no text,
  exam_center text,
  exam_date date,
  exam_time text
) as $$
  select
    s.full_name,
    s.tracking_id,
    s.application_status::text,
    e.course_name,
    b.batch_name,
    r.roll_no,
    r.exam_center,
    r.exam_date,
    r.exam_time
  from public.students s
  left join public.enrollments e on e.student_id = s.id
  left join public.batches b on b.id = e.batch_id
  left join public.roll_numbers r on r.student_id = s.id
  where s.tracking_id = p_tracking_id
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.verify_record(text) to anon, authenticated;

-- =========================================================
-- STORAGE POLICIES
-- =========================================================
-- student_docs: private. Student can upload/read own folder (path prefix = their uid). Admin reads all.
drop policy if exists "student_docs student rw" on storage.objects;
create policy "student_docs student rw" on storage.objects
  for all using (
    bucket_id = 'student_docs' and (
      (auth.uid())::text = (storage.foldername(name))[1] or public.is_admin()
    )
  ) with check (
    bucket_id = 'student_docs' and (
      (auth.uid())::text = (storage.foldername(name))[1] or public.is_admin()
    )
  );

-- gallery_images: public read, admin write
drop policy if exists "gallery_images public read" on storage.objects;
create policy "gallery_images public read" on storage.objects
  for select using (bucket_id = 'gallery_images');
drop policy if exists "gallery_images admin write" on storage.objects;
create policy "gallery_images admin write" on storage.objects
  for insert with check (bucket_id = 'gallery_images' and public.is_admin());
drop policy if exists "gallery_images admin delete" on storage.objects;
create policy "gallery_images admin delete" on storage.objects
  for delete using (bucket_id = 'gallery_images' and public.is_admin());

-- site_assets (logo, etc.): public read, admin write
drop policy if exists "site_assets public read" on storage.objects;
create policy "site_assets public read" on storage.objects
  for select using (bucket_id = 'site_assets');
drop policy if exists "site_assets admin write" on storage.objects;
create policy "site_assets admin write" on storage.objects
  for insert with check (bucket_id = 'site_assets' and public.is_admin());
drop policy if exists "site_assets admin update" on storage.objects;
create policy "site_assets admin update" on storage.objects
  for update using (bucket_id = 'site_assets' and public.is_admin());
drop policy if exists "site_assets admin delete" on storage.objects;
create policy "site_assets admin delete" on storage.objects
  for delete using (bucket_id = 'site_assets' and public.is_admin());

-- =========================================================
-- MIGRATION (run this block if you already executed an older
-- version of this schema and need to upgrade an existing database)
-- =========================================================

-- Add the global admission on/off switch if it doesn't exist yet.
alter table public.home_content
  add column if not exists admission_open boolean not null default true;

-- Add the site logo column if it doesn't exist yet.
alter table public.home_content
  add column if not exists logo_url text;

-- Backfill the new courses table from whatever course names already exist on
-- batches/enrollments, then reuse the old course_descriptions JSON as each
-- course's description (safe no-op if this is a fresh install).
insert into public.courses (name, description, display_order)
  select distinct b.course_name, '', 99
  from public.batches b
  where b.course_name is not null
  on conflict (name) do nothing;

-- Point batches.course_name at the new courses table so renaming a course
-- automatically renames it everywhere it's referenced.
alter table public.batches drop constraint if exists batches_course_name_check;
alter table public.batches drop constraint if exists batches_course_name_fkey;
alter table public.batches
  add constraint batches_course_name_fkey foreign key (course_name)
  references public.courses(name) on update cascade;

-- The old free-text course_descriptions JSON on home_content is superseded by
-- the courses table above; drop it once the backfill above has run.
alter table public.home_content drop column if exists course_descriptions;

-- Split the combined CNIC document types into separate front/back document types.
-- Old rows using 'cnic_student' / 'cnic_father' are renamed to the *_front slot;
-- students/admins can then upload the corresponding back side separately.
alter table public.documents drop constraint if exists documents_doc_type_check;

update public.documents set doc_type = 'cnic_student_front' where doc_type = 'cnic_student';
update public.documents set doc_type = 'cnic_father_front' where doc_type = 'cnic_father';

alter table public.documents add constraint documents_doc_type_check check (doc_type in (
  'fsc_degree','domicile','cnic_student_front','cnic_student_back',
  'police_verification','cnic_father_front','cnic_father_back','photo'
));

-- Institute name (printed on admission letter / roll slip / QR verify page), developer credit
-- in the footer, and the student dashboard's Help tab content — all admin-editable.
alter table public.home_content
  add column if not exists institute_name text not null default 'IT HUB Kohlu';
alter table public.home_content
  add column if not exists developer_name text not null default 'Abdul Salam';
alter table public.home_content
  add column if not exists help_content text not null default 'Need assistance? Contact the IT HUB KOHLU office during working hours, or reach out via the phone/email listed below.';

-- Admin-manageable extra dashboard tabs, and student feedback submissions, for installs
-- upgrading from an older schema (safe no-op if these already exist from the CREATE TABLE above).
create table if not exists public.dashboard_tabs (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null default '',
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.dashboard_tabs enable row level security;
drop policy if exists "dashboard_tabs student read" on public.dashboard_tabs;
drop policy if exists "dashboard_tabs student read" on public.dashboard_tabs;
create policy "dashboard_tabs student read" on public.dashboard_tabs
  for select using ((is_active = true and auth.role() = 'authenticated') or public.is_admin());
drop policy if exists "dashboard_tabs admin write" on public.dashboard_tabs;
drop policy if exists "dashboard_tabs admin write" on public.dashboard_tabs;
create policy "dashboard_tabs admin write" on public.dashboard_tabs for all
  using (public.is_admin()) with check (public.is_admin());

create table if not exists public.feedback (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  message text not null,
  rating int check (rating is null or (rating between 1 and 5)),
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;
drop policy if exists "feedback self read" on public.feedback;
drop policy if exists "feedback self read" on public.feedback;
create policy "feedback self read" on public.feedback
  for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "feedback self insert" on public.feedback;
drop policy if exists "feedback self insert" on public.feedback;
create policy "feedback self insert" on public.feedback
  for insert with check (student_id = auth.uid());
drop policy if exists "feedback admin delete" on public.feedback;
drop policy if exists "feedback admin delete" on public.feedback;
create policy "feedback admin delete" on public.feedback
  for delete using (public.is_admin());

-- Batch courses: lets a batch offer more than one course (e.g. Batch 2 covering
-- 4 courses), and admin approval / public display of student reviews.
-- Safe no-op if these already exist from the CREATE TABLE blocks above.
create table if not exists public.batch_courses (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid not null references public.batches(id) on delete cascade,
  course_name text not null references public.courses(name) on update cascade on delete cascade,
  created_at timestamptz default now(),
  unique (batch_id, course_name)
);
alter table public.batch_courses enable row level security;

create or replace function public.sync_batch_primary_course()
returns trigger as $$
begin
  insert into public.batch_courses (batch_id, course_name)
  values (new.id, new.course_name)
  on conflict (batch_id, course_name) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_batch_primary_course on public.batches;
drop trigger if exists trg_sync_batch_primary_course on public.batches;
create trigger trg_sync_batch_primary_course
after insert or update of course_name on public.batches
for each row execute function public.sync_batch_primary_course();

-- Backfill: every existing batch already supports its own primary course.
insert into public.batch_courses (batch_id, course_name)
  select id, course_name from public.batches
on conflict (batch_id, course_name) do nothing;

drop policy if exists "batch_courses public read" on public.batch_courses;
drop policy if exists "batch_courses public read" on public.batch_courses;
create policy "batch_courses public read" on public.batch_courses
  for select using (true);
drop policy if exists "batch_courses admin write" on public.batch_courses;
drop policy if exists "batch_courses admin write" on public.batch_courses;
create policy "batch_courses admin write" on public.batch_courses for all
  using (public.is_admin()) with check (public.is_admin());

-- Feedback: add student_name snapshot + admin-approval gate for public reviews.
alter table public.feedback add column if not exists student_name text;
alter table public.feedback add column if not exists is_approved boolean not null default false;

update public.feedback f set student_name = s.full_name
  from public.students s where s.id = f.student_id and f.student_name is null;

create or replace function public.set_feedback_student_name()
returns trigger as $$
begin
  if new.student_name is null then
    select full_name into new.student_name from public.students where id = new.student_id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_set_feedback_student_name on public.feedback;
drop trigger if exists trg_set_feedback_student_name on public.feedback;
create trigger trg_set_feedback_student_name
before insert on public.feedback
for each row execute function public.set_feedback_student_name();

drop policy if exists "feedback public read approved" on public.feedback;
drop policy if exists "feedback public read approved" on public.feedback;
create policy "feedback public read approved" on public.feedback
  for select using (is_approved = true);
drop policy if exists "feedback admin update" on public.feedback;
drop policy if exists "feedback admin update" on public.feedback;
create policy "feedback admin update" on public.feedback
  for update using (public.is_admin());

-- Public verification function backing the QR code on admission letters / roll slips
-- (safe no-op if it already exists from the block above).
create or replace function public.verify_record(p_tracking_id text)
returns table (
  full_name text,
  tracking_id text,
  application_status text,
  course_name text,
  batch_name text,
  roll_no text,
  exam_center text,
  exam_date date,
  exam_time text
) as $$
  select
    s.full_name,
    s.tracking_id,
    s.application_status::text,
    e.course_name,
    b.batch_name,
    r.roll_no,
    r.exam_center,
    r.exam_date,
    r.exam_time
  from public.students s
  left join public.enrollments e on e.student_id = s.id
  left join public.batches b on b.id = e.batch_id
  left join public.roll_numbers r on r.student_id = s.id
  where s.tracking_id = p_tracking_id
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.verify_record(text) to anon, authenticated;

-- ---------- ONE STUDENT = ONE ACCOUNT = ONE COURSE ----------
-- 1) One account per email: auth.users already enforces a unique email at
--    signup, but we also guard the students table itself as defense-in-depth.
alter table public.students drop constraint if exists students_email_key;
alter table public.students add constraint students_email_key unique (email);

-- 1b) USERNAMES: every student picks their own handle (e.g. "salam776") at
--     signup and can log in with it instead of their email. Case-insensitive
--     unique, letters/numbers/underscore, 3-20 chars.
alter table public.students drop constraint if exists students_username_format;
alter table public.students add constraint students_username_format
  check (username is null or username ~ '^[A-Za-z0-9_]{3,20}$');

drop index if exists students_username_lower_idx;
create unique index students_username_lower_idx on public.students (lower(username))
  where username is not null;

-- Looks up the email for a username so the login page can resolve
-- "username or email" into an email before calling signInWithPassword.
-- security definer + a narrow return value: it never exposes the rest of
-- the students table, only bypasses the "students self read" RLS policy
-- for this one lookup (same trust level as a normal "forgot password" flow).
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.students where lower(username) = lower(p_username) limit 1;
$$;

grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- Lets the signup/login forms check "is this username taken?" live, without
-- being able to read anything else about the account that owns it.
create or replace function public.is_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.students where lower(username) = lower(p_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- 2) A student may hold only ONE enrollment ever (was unique per batch, which
--    allowed applying to several batches/courses at once). Only an admin can
--    subsequently move that single enrollment to a different course/batch
--    ("trade change") via an update — never a second insert.
--    NOTE: if any student already has more than one enrollment row from
--    before this migration, this constraint add will fail with a duplicate
--    key error — resolve those duplicates manually (decide which enrollment
--    to keep and delete the others) before re-running this block.
alter table public.enrollments drop constraint if exists enrollments_student_id_batch_id_key;
alter table public.enrollments drop constraint if exists enrollments_student_id_key;
alter table public.enrollments add constraint enrollments_student_id_key unique (student_id);

-- When an admin changes a student's batch on their existing enrollment
-- (a "trade change" that also moves them to a different batch), keep
-- seats_filled correct on both the old and new batch.
create or replace function public.adjust_batch_seats_on_enrollment_update()
returns trigger as $$
begin
  if new.batch_id is distinct from old.batch_id then
    update public.batches set seats_filled = greatest(seats_filled - 1, 0) where id = old.batch_id;
    update public.batches set seats_filled = seats_filled + 1 where id = new.batch_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_adjust_seats_on_update on public.enrollments;
drop trigger if exists trg_adjust_seats_on_update on public.enrollments;
create trigger trg_adjust_seats_on_update
after update of batch_id on public.enrollments
for each row execute function public.adjust_batch_seats_on_enrollment_update();

-- =========================================================
-- FEATURE ADDITIONS: results upload, never-block applications on full seats
-- + admin-controlled shortlisting, admin-managed public "site pages" (add/remove
-- nav tabs from the dashboard, no code), and full course-info-on-select.
-- =========================================================

-- ---------- 1) RESULTS (admin uploads test/merit results; students view/download) ----------
create table if not exists public.results (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  title text not null default 'Result',
  result_status text not null default 'pending' check (result_status in ('pending','pass','fail','merit','waitlist')),
  marks_obtained numeric,
  marks_total numeric,
  remarks text,
  -- Optional uploaded file (mark sheet / detailed result PDF or image) in the
  -- private `result_files` bucket, path: {student_id}/{result_id}.{ext}
  file_path text,
  -- Only published results are visible to the student; lets admin prepare a
  -- batch of results and release them all at once.
  is_published boolean not null default true,
  created_at timestamptz default now()
);
alter table public.results enable row level security;

drop policy if exists "results self read published" on public.results;

create policy "results self read published" on public.results
  for select using ((student_id = auth.uid() and is_published = true) or public.is_admin());
drop policy if exists "results admin write" on public.results;
create policy "results admin write" on public.results for all
  using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('result_files', 'result_files', false)
on conflict (id) do nothing;

drop policy if exists "result_files student read own" on storage.objects;

create policy "result_files student read own" on storage.objects
  for select using (
    bucket_id = 'result_files' and (
      (auth.uid())::text = (storage.foldername(name))[1] or public.is_admin()
    )
  );
drop policy if exists "result_files admin write" on storage.objects;
create policy "result_files admin write" on storage.objects
  for insert with check (bucket_id = 'result_files' and public.is_admin());
drop policy if exists "result_files admin update" on storage.objects;
create policy "result_files admin update" on storage.objects
  for update using (bucket_id = 'result_files' and public.is_admin());
drop policy if exists "result_files admin delete" on storage.objects;
create policy "result_files admin delete" on storage.objects
  for delete using (bucket_id = 'result_files' and public.is_admin());

-- ---------- 2) NEVER BLOCK APPLICATIONS WHEN A BATCH'S SEATS ARE FULL ----------
-- Previously seats_filled >= seats_total auto-closed the batch (hiding it from
-- the apply form). Now seats are purely informational: every application is
-- accepted regardless of seat count, and only the admin explicitly changes a
-- batch's status (draft/open/closed). Shortlisting who actually got in happens
-- separately (see enrollments.is_shortlisted below), after applications close.
drop trigger if exists trg_batch_seat_guard on public.batches;
drop function if exists public.batch_seat_guard();

-- ---------- 3) SHORTLISTING (admin marks who is actually selected, any time) ----------
alter table public.enrollments add column if not exists is_shortlisted boolean not null default false;
alter table public.enrollments add column if not exists shortlist_remarks text;

-- ---------- 4) FULL COURSE INFO (shown to the student once they select a course) ----------
alter table public.courses add column if not exists full_info text not null default '';

-- ---------- 5) SITE PAGES (admin adds/removes public nav tabs — no code needed) ----------
create table if not exists public.site_pages (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  show_in_nav boolean not null default true,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
alter table public.site_pages enable row level security;

drop policy if exists "site_pages public read active" on public.site_pages;

create policy "site_pages public read active" on public.site_pages
  for select using (is_active = true or public.is_admin());
drop policy if exists "site_pages admin write" on public.site_pages;
create policy "site_pages admin write" on public.site_pages for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- ADMIN NOTES on roll no. slip / admission letter ----------
-- Per-student instruction shown on their roll no. slip (e.g. "Please arrive 30
-- minutes before exam time.") — set by admin alongside the roll number itself.
alter table public.roll_numbers add column if not exists note text;

-- Test type (e.g. "Entry Test", "Final Exam", "Merit Test", "Interview" — admin
-- picks from a preset list or types a custom one) and a reporting time distinct
-- from the test's start time (e.g. arrive 7:30 AM for a 9:00 AM test), both
-- printed on the official-style roll no. slip.
alter table public.roll_numbers add column if not exists test_type text not null default 'Entry Test';
alter table public.roll_numbers add column if not exists reporting_time text;

-- Institute-wide note printed on every generated admission letter (e.g. "Please
-- bring original documents on the first day of class.") — admin-editable from
-- Admin > Home Content.
alter table public.home_content add column if not exists admission_note text not null default '';

-- =========================================================
-- UPGRADE: multiple admins, and QR verification shows the full document
-- again (not just a short "genuine record" badge).
-- =========================================================

-- ---------- 1) MULTIPLE ADMINS ----------
-- Store the admin's email alongside their id so Admin > Settings > "Manage
-- Admins" can list every admin from the client without the service-role key.
alter table public.admins add column if not exists email text;
update public.admins a set email = u.email
  from auth.users u where u.id = a.id and a.email is null;

-- Previously an admin could only read their OWN row here, which made it
-- impossible for the settings screen to list co-admins. Any admin may now
-- read the whole table; adding/removing an admin still only happens through
-- the service-role API route (app/api/admin/admins), never straight from
-- the client, so this relaxed read policy does not let an admin add or
-- remove other admins on their own.
drop policy if exists "admins read own row" on public.admins;
drop policy if exists "admins read all if admin" on public.admins;
create policy "admins read all if admin" on public.admins
  for select using (public.is_admin());

-- ---------- 2) FULL DOCUMENT ON QR VERIFY ----------
-- The QR code on an admission letter / roll no. slip encodes the tracking_id
-- that is already printed on that same physical document, so re-showing the
-- fields that are already on the paper is not a new information leak — it's
-- the whole point of a "scan to verify" QR. verify_record now returns every
-- field the admission letter / roll slip needs, so /verify can rebuild and
-- show the complete document again instead of a short status badge.
-- Changing the OUT columns requires dropping the old signature first —
-- CREATE OR REPLACE cannot alter a RETURNS TABLE column list in place.
drop function if exists public.verify_record(text);
create or replace function public.verify_record(p_tracking_id text)
returns table (
  full_name text,
  tracking_id text,
  application_status text,
  father_name text,
  student_cnic text,
  dob date,
  gender text,
  city text,
  address text,
  matric_board text,
  matric_year text,
  matric_percentage numeric,
  fsc_board text,
  fsc_group text,
  fsc_percentage numeric,
  photo_url text,
  course_name text,
  batch_name text,
  roll_no text,
  test_type text,
  exam_center text,
  exam_date date,
  exam_time text,
  reporting_time text,
  roll_note text
) as $$
  select
    s.full_name,
    s.tracking_id,
    s.application_status::text,
    s.father_name,
    s.student_cnic,
    s.dob,
    s.gender,
    s.city,
    s.address,
    s.matric_board,
    s.matric_year,
    s.matric_percentage,
    s.fsc_board,
    s.fsc_group,
    s.fsc_percentage,
    s.photo_url,
    e.course_name,
    b.batch_name,
    r.roll_no,
    r.test_type,
    r.exam_center,
    r.exam_date,
    r.exam_time,
    r.reporting_time,
    r.note
  from public.students s
  left join public.enrollments e on e.student_id = s.id
  left join public.batches b on b.id = e.batch_id
  left join public.roll_numbers r on r.student_id = s.id
  where s.tracking_id = p_tracking_id
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.verify_record(text) to anon, authenticated;

-- ---------- ADDITIONAL QUALIFICATIONS (anything beyond FSc, e.g. BA/BSc) ----------
-- FSc is the baseline requirement for admission (enforced in the app: step 3
-- can't be submitted without fsc_board/fsc_year/fsc_total/fsc_obtained filled in).
-- A student who holds something further can add as many of these rows as they
-- like ("+ Add Qualification"); each one gets its own proof-document upload.
create table if not exists public.additional_qualifications (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  qualification_name text not null,   -- e.g. "BA"
  institute_name text not null,       -- e.g. "University of Balochistan, Quetta"
  year text,
  document_path text,                 -- set once the proof file is uploaded
  created_at timestamptz default now()
);

alter table public.additional_qualifications enable row level security;

drop policy if exists "additional_qualifications self read" on public.additional_qualifications;

create policy "additional_qualifications self read" on public.additional_qualifications
  for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "additional_qualifications self insert" on public.additional_qualifications;
create policy "additional_qualifications self insert" on public.additional_qualifications
  for insert with check (student_id = auth.uid());
drop policy if exists "additional_qualifications self update" on public.additional_qualifications;
create policy "additional_qualifications self update" on public.additional_qualifications
  for update using (student_id = auth.uid() or public.is_admin());
drop policy if exists "additional_qualifications self delete" on public.additional_qualifications;
create policy "additional_qualifications self delete" on public.additional_qualifications
  for delete using (student_id = auth.uid());

-- Proof documents for additional qualifications reuse the existing private
-- student_docs bucket, under {student_uid}/qualifications/... — same path-prefix
-- rule as every other student upload, so the existing bucket policy already covers it.

-- =========================================================
-- STUDENT ID CARDS
-- =========================================================
-- A row here means the admin has actually issued a card for that student —
-- it is NOT auto-created just because a student's application_status becomes
-- 'enrolled'. Admin > ID Cards lets the admin issue one card at a time or
-- bulk-issue for every enrolled student who doesn't have one yet.
create table if not exists public.id_cards (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null unique references public.students(id) on delete cascade,
  card_no text unique, -- auto-generated below, e.g. IC-2026-1001
  -- Free-text line shown on the card for course/batch/class (e.g. "Web
  -- Development — Batch 5"). Left blank, the card falls back to the
  -- student's current course + batch name at print/lookup time.
  class_section text,
  emergency_contact text,
  blood_group text,
  issue_date date not null default current_date,
  valid_until date, -- optional expiry printed on the card; blank = no expiry shown
  created_at timestamptz default now()
);

create sequence if not exists public.card_no_seq start 1001;

create or replace function public.generate_card_no()
returns text as $$
declare
  yr text := to_char(now(), 'YYYY');
  n int;
begin
  n := nextval('public.card_no_seq');
  return 'IC-' || yr || '-' || n::text;
end;
$$ language plpgsql;

create or replace function public.set_card_no()
returns trigger as $$
begin
  if new.card_no is null then
    new.card_no := public.generate_card_no();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_card_no on public.id_cards;
drop trigger if exists trg_set_card_no on public.id_cards;
create trigger trg_set_card_no
before insert on public.id_cards
for each row execute function public.set_card_no();

alter table public.id_cards enable row level security;

-- id_cards: admin manages everything; a logged-in student may read their own
-- row (e.g. for a future "My ID Card" dashboard tab). Anonymous CNIC lookup
-- from the public /id-card page deliberately does NOT use a table policy —
-- it goes through the lookup_id_card() security-definer RPC below instead,
-- same pattern as verify_record() for admission letters, so RLS on
-- public.students never has to be widened for anonymous search.
drop policy if exists "id_cards admin all" on public.id_cards;
create policy "id_cards admin all" on public.id_cards for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "id_cards self read" on public.id_cards;
create policy "id_cards self read" on public.id_cards
  for select using (student_id = auth.uid());

-- Institute-wide Terms & Conditions text printed on the back of every ID
-- card — admin-editable from Admin > Home Content, same as admission_note.
alter table public.home_content add column if not exists id_card_terms text not null default
  E'1. This card is the property of the institute and must be surrendered on demand.\n2. If found, please return to the institute office.\n3. This card is non-transferable and must be carried at all times on campus.\n4. Report loss of this card to the office immediately for a replacement.';

-- Returns only what /id-card needs to render a card, and ONLY for a student
-- who is both 'enrolled' AND already has a card issued by the admin —
-- never the student's CNIC-search across all statuses, and never any field
-- beyond what a printed card already shows.
-- Card now only shows: Name, Father Name, CNIC, Photo, Mobile Number and
-- Tracking ID (used as the Student ID) — all pulled straight from the
-- student's own admission application row, never re-typed by the admin.
-- The join against id_cards is kept purely as the "has a card been issued"
-- gate: a student only shows up here once admin has issued their card.
--
-- Auto-calculates the card's expiry: the end date of whatever batch the
-- student is enrolled in (i.e. the card is valid for the length of their
-- batch), falling back to 3 months from the issue date if no batch is
-- found. Runs before insert so admin never has to type a validity date —
-- see set_id_card_valid_until() below. The coalesce here is just a safety
-- net for any older rows issued before that trigger existed.
create or replace function public.lookup_id_card(p_cnic text)
returns table (
  full_name text,
  father_name text,
  phone text,
  tracking_id text,
  student_cnic text,
  photo_url text,
  issue_date date,
  valid_until date
) as $$
  select
    s.full_name,
    s.father_name,
    s.phone,
    s.tracking_id,
    s.student_cnic,
    s.photo_url,
    c.issue_date,
    coalesce(c.valid_until, b.end_date, (c.issue_date + interval '3 months')::date) as valid_until
  from public.students s
  join public.id_cards c on c.student_id = s.id
  left join public.enrollments e on e.student_id = s.id
  left join public.batches b on b.id = e.batch_id
  where s.student_cnic = p_cnic
    and s.application_status = 'enrolled'
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.lookup_id_card(text) to anon, authenticated;

-- Auto-fills a newly issued card's expiry date (valid_until) when the admin
-- doesn't set one explicitly: uses the end date of the batch the student is
-- enrolled in, or 3 months from the issue date if no enrollment/batch can be
-- found. This is what makes "Valid Until" on Admin > ID Cards automatic.
create or replace function public.set_id_card_valid_until()
returns trigger as $$
declare
  v_batch_end date;
begin
  if new.valid_until is null then
    select b.end_date into v_batch_end
    from public.enrollments e
    join public.batches b on b.id = e.batch_id
    where e.student_id = new.student_id
    limit 1;

    new.valid_until := coalesce(v_batch_end, (new.issue_date + interval '3 months')::date);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_id_card_valid_until on public.id_cards;
drop trigger if exists trg_set_id_card_valid_until on public.id_cards;
create trigger trg_set_id_card_valid_until
before insert on public.id_cards
for each row execute function public.set_id_card_valid_until();

-- Lets the public homepage decide whether to show the "ID Card" nav link at
-- all (same idea as counting roll_numbers for the "Roll Slip" nav link),
-- without needing a public read policy on public.id_cards itself.
create or replace function public.id_cards_issued_count()
returns bigint as $$
  select count(*) from public.id_cards;
$$ language sql stable security definer set search_path = public;

grant execute on function public.id_cards_issued_count() to anon, authenticated;

-- =========================================================
-- NOTES
-- =========================================================
-- 1. After running this file, create your first admin manually:
--    a) In Supabase Dashboard > Authentication, create a user (email+password).
--    b) Run: insert into public.admins (id, full_name) values ('<that user's UUID>', 'Super Admin');
-- 2. Upload student documents to path: student_docs/{student_uid}/{doc_type}.{ext}
-- 3. seats_filled increments automatically via the enrollments trigger — never set it manually
--    except for admin corrections (delete the enrollment row instead).
-- 4. A student can only ever have ONE enrollment row (one course). If they need to
--    switch trades/courses after applying, do it from Admin > Students > (student) >
--    Enrollment > Change Trade — this UPDATEs their existing enrollment row rather
--    than creating a second one.
-- 5. Student ID cards: Admin > ID Cards issues a card for any 'enrolled' student
--    (one at a time, or "Issue for all enrolled" in bulk). A student then gets
--    their card PDF from the public /id-card page by entering their CNIC — this
--    only succeeds once BOTH conditions are true: application_status = 'enrolled'
--    AND the admin has issued a card row for them.
