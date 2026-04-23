-- 0011_break_reason.sql — Record a break-reason on rally_board.
-- Safe to run twice. Paste into Supabase SQL Editor.
--
-- When a user's streak breaks, the client opens BreakReasonModal and posts
-- the reason here. We upsert their rally_board row so the whole crew sees
-- *why* they went quiet and can nudge them back with the right tone.

create or replace function public.post_break_reason(
  p_reason text,
  p_note   text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid := auth.uid();
  v_today date := (now() at time zone 'utc')::date;
  v_last  date;
  v_lost  int  := 0;
  v_off   int  := 1;
  v_note  text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_reason), '') = '' then raise exception 'reason required'; end if;
  if char_length(p_reason) > 40  then raise exception 'reason too long';        end if;
  if p_note is not null and char_length(p_note) > 160 then
    raise exception 'note too long (max 160)';
  end if;

  -- Pull whatever streak context we have. Streak sweep may or may not have
  -- run yet; either way we record what we can.
  select last_day, current_len
    into v_last, v_lost
  from public.streaks
  where user_id = v_user;

  if v_last is not null then
    v_off := greatest(1, (v_today - v_last));
  end if;

  v_note := trim(p_reason);
  if p_note is not null and length(trim(p_note)) > 0 then
    v_note := v_note || ' — ' || trim(p_note);
  end if;

  -- Upsert. If streak-sweep already listed the user, we refresh the note
  -- and let days_off / streak_lost stand. Otherwise insert fresh.
  insert into public.rally_board (user_id, days_off, streak_lost, note, listed_at)
  values (v_user, v_off, coalesce(v_lost, 0), v_note, now())
  on conflict (user_id) do update
    set note        = excluded.note,
        listed_at   = public.rally_board.listed_at,           -- keep original list time
        days_off    = greatest(public.rally_board.days_off, excluded.days_off),
        streak_lost = greatest(public.rally_board.streak_lost, excluded.streak_lost);

  return jsonb_build_object(
    'ok',          true,
    'days_off',    v_off,
    'streak_lost', coalesce(v_lost, 0),
    'note',        v_note
  );
end;
$$;

grant execute on function public.post_break_reason(text, text) to authenticated;

-- ────────────────────────────────────────────────────────────
-- Verify (optional):
--   select public.post_break_reason('sick', 'Flu. Back Tuesday.');
--   select * from public.rally_board where user_id = auth.uid();
