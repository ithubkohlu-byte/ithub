-- =========================================================
-- UPDATE 4  (run in Supabase > SQL Editor)
-- Public ID-card QR: show "rejected by administration" when the
-- admin has rejected/disabled a student's card.
-- =========================================================

-- Returns a row ONLY when the student's card has been rejected.
-- The normal lookup_id_card() only finds issued cards, so a rejected
-- card (which has its id_cards row deleted) would otherwise look like
-- "not found". Same CNIC / Tracking ID matching as lookup_id_card().
create or replace function public.is_id_card_rejected(p_cnic text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with q as (
    select trim(coalesce(p_cnic, '')) as raw,
           regexp_replace(coalesce(p_cnic, ''), '\D', '', 'g') as digits
  )
  select jsonb_build_object(
    'full_name', s.full_name,
    'tracking_id', s.tracking_id,
    'status', 'rejected'
  )
  from q, public.students s
  where s.id_card_rejected = true
    and length(q.raw) >= 5
    and (
         upper(s.tracking_id) = upper(q.raw)
      or (
           length(q.digits) = 13
           and regexp_replace(coalesce(s.student_cnic, ''), '\D', '', 'g') = q.digits
         )
    )
  limit 1;
$$;

grant execute on function public.is_id_card_rejected(text) to anon, authenticated;
