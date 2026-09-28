-- UPDATE 3: make the public ID-card lookup tolerant.
-- Before: exact match on the CNIC text, so "1234512345671" never matched a
-- stored "12345-1234567-1" (and vice-versa). Now: CNIC in any format (dashes
-- or not) OR the Tracking ID. Same signature, so this simply replaces it.
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
  where s.application_status = 'enrolled'
    and length(trim(coalesce(p_cnic, ''))) >= 5
    and (
         upper(s.tracking_id) = upper(trim(p_cnic))
      or (
           length(regexp_replace(coalesce(p_cnic, ''), '\D', '', 'g')) = 13
           and regexp_replace(coalesce(s.student_cnic, ''), '\D', '', 'g') = regexp_replace(p_cnic, '\D', '', 'g')
         )
    )
  limit 1;
$$ language sql stable security definer set search_path = public;

grant execute on function public.lookup_id_card(text) to anon, authenticated;
