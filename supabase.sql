-- ============================================================
-- IT HUB Admission System - Full Supabase Schema
-- Run this in the Supabase SQL editor (Project > SQL Editor)
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. home_content
-- ------------------------------------------------------------
create table if not exists home_content (
  id uuid primary key default gen_random_uuid(),
  hero_title text default 'Shape Your Future With IT HUB',
  hero_subtitle text default 'Premium IT training in Web Development, Graphic Designing, Digital Marketing & E-Commerce.',
  about_text text default 'IT HUB Institute is a leading technology training center dedicated to producing industry-ready professionals.',
  why_choose_us_points jsonb default '["Expert Instructors","Hands-on Projects","Job Placement Support","Modern Curriculum"]',
  contact_phone text default '03324455006',
  contact_address text default 'IT HUB Institute, Kohlu',
  contact_email text default 'ithubkohlu@gmail.com',
  course_descriptions jsonb default '{
    "web": {"title":"Web Developing","desc":"Learn HTML, CSS, JS, React & Next.js from scratch to advanced."},
    "graphic": {"title":"Graphic Designing","desc":"Master Photoshop, Illustrator & modern design principles."},
    "marketing": {"title":"Digital Marketing","desc":"SEO, Social Media Marketing, Google & Meta Ads."},
    "ecommerce": {"title":"E-Commerce","desc":"Amazon, Shopify & dropshipping business mastery."}
  }',
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. batches
-- ------------------------------------------------------------
create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  batch_name text not null,
  course_name text not null check (course_name in ('Web Developing','Graphic Designing','Digital Marketing','E-Commerce')),
  start_date date not null,
  end_date date not null,
  seats_total int not null default 50,
  seats_filled int not null default 0,
  status text not null default 'Draft' check (status in ('Draft','Open','Closed')),
  is_announced boolean not null default false,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 3. students
-- ------------------------------------------------------------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  tracking_id text unique not null,
  full_name text not null,
  email text not null,
  phone text not null,
  father_name text,
  dob date,
  gender text check (gender in ('Male','Female','Other')),
  address text,
  city text,
  cnic text,
  father_cnic text,
  matric_board text,
  matric_year text,
  matric_total numeric,
  matric_obtained numeric,
  matric_percent numeric,
  fsc_board text,
  fsc_year text,
  fsc_group text,
  fsc_total numeric,
  fsc_obtained numeric,
  fsc_percent numeric,
  status text not null default 'Pending' check (status in ('Pending','Verified','Rejected','Enrolled')),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. enrollments
-- ------------------------------------------------------------
create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  course_name text not null,
  batch_id uuid references batches(id),
  admission_date date default now(),
  status text default 'Pending' check (status in ('Pending','Approved','Rejected')),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 5. documents
-- ------------------------------------------------------------
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  doc_type text not null check (doc_type in ('fsc_degree','domicile','cnic','police_verification','father_cnic','photo')),
  file_url text not null,
  status text default 'Pending' check (status in ('Pending','Verified','Rejected')),
  admin_comment text,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 6. gallery
-- ------------------------------------------------------------
create table if not exists gallery (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  batch_name text,
  caption text,
  is_visible boolean default true,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 7. roll_numbers
-- ------------------------------------------------------------
create table if not exists roll_numbers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete cascade,
  roll_no text unique not null,
  exam_center text,
  exam_date date,
  exam_time time,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Admins table (marks which auth users are super admins)
-- ------------------------------------------------------------
create table if not exists admins (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- Helper: is_admin()
-- ------------------------------------------------------------
create or replace function is_admin() returns boolean as $$
  select exists (select 1 from admins where id = auth.uid());
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- Atomic seat increment function (avoids race conditions)
-- ------------------------------------------------------------
create or replace function increment_batch_seat(p_batch_id uuid)
returns boolean as $$
declare
  v_total int;
  v_filled int;
begin
  select seats_total, seats_filled into v_total, v_filled
  from batches where id = p_batch_id for update;

  if v_filled >= v_total then
    return false;
  end if;

  update batches
  set seats_filled = seats_filled + 1,
      status = case when seats_filled + 1 >= v_total then 'Closed' else status end
  where id = p_batch_id;

  return true;
end;
$$ language plpgsql security definer;

-- Auto-generate tracking_id: ITHUB-YYYY-1001, 1002, ...
create or replace function next_tracking_id() returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_max int;
begin
  select coalesce(max(split_part(tracking_id,'-',3)::int), 1000)
  into v_max from students where tracking_id like 'ITHUB-'||v_year||'-%';
  return 'ITHUB-'||v_year||'-'||(v_max+1)::text;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table home_content enable row level security;
alter table batches enable row level security;
alter table students enable row level security;
alter table enrollments enable row level security;
alter table documents enable row level security;
alter table gallery enable row level security;
alter table roll_numbers enable row level security;
alter table admins enable row level security;

-- home_content: public read, admin write
create policy "public read home_content" on home_content for select using (true);
create policy "admin write home_content" on home_content for all using (is_admin()) with check (is_admin());

-- batches: public read only announced, admin full
create policy "public read announced batches" on batches for select using (is_announced = true or is_admin());
create policy "admin write batches" on batches for insert with check (is_admin());
create policy "admin update batches" on batches for update using (is_admin());
create policy "admin delete batches" on batches for delete using (is_admin());

-- students: owner can read/update own row, admin full, insert allowed for authenticated (signup flow)
create policy "student read own" on students for select using (auth.uid() = auth_user_id or is_admin());
create policy "student insert own" on students for insert with check (auth.uid() = auth_user_id);
create policy "student update own" on students for update using (auth.uid() = auth_user_id or is_admin());
create policy "admin delete students" on students for delete using (is_admin());

-- enrollments
create policy "enrollment read own" on enrollments for select using (
  exists (select 1 from students s where s.id = enrollments.student_id and (s.auth_user_id = auth.uid() or is_admin()))
);
create policy "enrollment insert own" on enrollments for insert with check (
  exists (select 1 from students s where s.id = enrollments.student_id and s.auth_user_id = auth.uid())
);
create policy "admin update enrollments" on enrollments for update using (is_admin());
create policy "admin delete enrollments" on enrollments for delete using (is_admin());

-- documents
create policy "doc read own" on documents for select using (
  exists (select 1 from students s where s.id = documents.student_id and (s.auth_user_id = auth.uid() or is_admin()))
);
create policy "doc insert own" on documents for insert with check (
  exists (select 1 from students s where s.id = documents.student_id and s.auth_user_id = auth.uid())
);
create policy "admin update docs" on documents for update using (is_admin());
create policy "admin delete docs" on documents for delete using (is_admin());

-- gallery: public read visible, admin full
create policy "public read visible gallery" on gallery for select using (is_visible = true or is_admin());
create policy "admin write gallery" on gallery for insert with check (is_admin());
create policy "admin update gallery" on gallery for update using (is_admin());
create policy "admin delete gallery" on gallery for delete using (is_admin());

-- roll_numbers: public read (needed for public roll-slip lookup), admin write
create policy "public read roll_numbers" on roll_numbers for select using (true);
create policy "admin write roll_numbers" on roll_numbers for insert with check (is_admin());
create policy "admin update roll_numbers" on roll_numbers for update using (is_admin());
create policy "admin delete roll_numbers" on roll_numbers for delete using (is_admin());

-- admins: only admins can read the admins table
create policy "admin read admins" on admins for select using (is_admin());

-- ------------------------------------------------------------
-- Storage buckets (run once). Create manually in Supabase Studio too:
-- 'student_docs' (private), 'gallery_images' (public)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('student_docs','student_docs', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('gallery_images','gallery_images', true)
  on conflict (id) do nothing;

create policy "student upload own docs" on storage.objects for insert
  with check (bucket_id = 'student_docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "student read own docs" on storage.objects for select
  using (bucket_id = 'student_docs' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy "admin manage gallery images" on storage.objects for all
  using (bucket_id = 'gallery_images' and is_admin()) with check (bucket_id = 'gallery_images' and is_admin());
create policy "public read gallery images" on storage.objects for select
  using (bucket_id = 'gallery_images');

-- Seed one home_content row if empty
insert into home_content (id) select gen_random_uuid() where not exists (select 1 from home_content);

-- NOTE: To create your first admin, sign up a user normally via Supabase Auth
-- (or Studio > Authentication > Add user), then run:
-- insert into admins (id) values ('<that user''s auth.users id>');
