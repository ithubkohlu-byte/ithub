-- =========================================================
-- UPDATE 2  (run in Supabase > SQL Editor)
-- STEP 1: run ONLY the next line first, on its own, and press Run.
-- =========================================================
alter type application_status add value if not exists 'struck_off';

-- =========================================================
-- STEP 2: after step 1 succeeded, run everything below in one go.
-- =========================================================

-- ID card reject flag (admin > ID Cards > "Reject Card")
alter table public.students add column if not exists id_card_rejected boolean not null default false;

-- ---------- PUBLIC ROLL SLIP SEARCH (tracking ID / CNIC / roll no) ----------
-- Anonymous visitors cannot read students/roll_numbers directly (RLS), so the
-- roll-slip page asks this function instead. Exact match only, narrow output.
create or replace function public.lookup_roll_slip(p_query text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select trim(p_query) as raw,
           regexp_replace(coalesce(p_query, ''), '\D', '', 'g') as digits
  )
  select jsonb_build_object(
    'student', jsonb_build_object(
      'id', s.id, 'full_name', s.full_name, 'father_name', s.father_name,
      'tracking_id', s.tracking_id, 'student_cnic', s.student_cnic,
      'photo_url', s.photo_url, 'gender', s.gender, 'phone', s.phone
    ),
    'roll', to_jsonb(r),
    'course_name', e.course_name,
    'batch_name', b.batch_name
  )
  from q, public.students s
  join public.roll_numbers r on r.student_id = s.id
  left join public.enrollments e on e.student_id = s.id
  left join public.batches b on b.id = e.batch_id
  where length(q.raw) >= 5 and (
        upper(s.tracking_id) = upper(q.raw)
     or (length(q.digits) = 13 and regexp_replace(coalesce(s.student_cnic, ''), '\D', '', 'g') = q.digits)
     or upper(r.roll_no) = upper(q.raw)
  )
  order by r.exam_date desc nulls last
  limit 1;
$$;
grant execute on function public.lookup_roll_slip(text) to anon, authenticated;

-- ---------- PUBLIC RESULT SEARCH (tracking ID / CNIC) ----------
create or replace function public.lookup_result(p_query text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select trim(p_query) as raw,
           regexp_replace(coalesce(p_query, ''), '\D', '', 'g') as digits
  ), st as (
    select s.* from q, public.students s
    where length(q.raw) >= 5 and (
          upper(s.tracking_id) = upper(q.raw)
       or (length(q.digits) = 13 and regexp_replace(coalesce(s.student_cnic, ''), '\D', '', 'g') = q.digits)
    )
    limit 1
  )
  select jsonb_build_object(
    'student', jsonb_build_object(
      'full_name', st.full_name, 'father_name', st.father_name,
      'tracking_id', st.tracking_id, 'student_cnic', st.student_cnic,
      'photo_url', st.photo_url
    ),
    'course_name', (select e.course_name from public.enrollments e where e.student_id = st.id limit 1),
    'batch_name', (select b.batch_name from public.enrollments e join public.batches b on b.id = e.batch_id where e.student_id = st.id limit 1),
    'roll_no', (select r.roll_no from public.roll_numbers r where r.student_id = st.id limit 1),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id, 'title', x.title, 'result_status', x.result_status,
        'marks_obtained', x.marks_obtained, 'marks_total', x.marks_total,
        'remarks', x.remarks, 'created_at', x.created_at
      ) order by x.created_at desc)
      from public.results x where x.student_id = st.id and x.is_published = true
    ), '[]'::jsonb)
  )
  from st;
$$;
grant execute on function public.lookup_result(text) to anon, authenticated;

-- Lets the homepage decide whether to show the "Results" nav tab.
create or replace function public.results_published_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.results where is_published = true;
$$;
grant execute on function public.results_published_count() to anon, authenticated;
