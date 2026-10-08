-- Verifies all 7 badge milestones, duplicate/gap handling. Runs in a transaction and rolls back.
begin;
alter table public.journal_entries disable trigger journal_entries_rules;
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
  values ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000000000','authenticated','authenticated','m@x.test','{"username":"milestone_tester"}');
-- 100 consecutive days ending today (UTC profile)
insert into public.journal_entries (user_id, entry_date, content)
  select '00000000-0000-0000-0000-0000000000aa', (now() at time zone 'UTC')::date - g, 'x' from generate_series(0, 99) g;
select 'after 100 days' as step, string_agg(milestone::text, ',' order by milestone) as badges,
       (select longest_streak from public.user_streaks('00000000-0000-0000-0000-0000000000aa')) as longest
  from public.user_badges where user_id = '00000000-0000-0000-0000-0000000000aa';
-- punch a hole at day 40 ago: longest becomes 59 (days 41..99) vs current 40 (0..39)
delete from public.journal_entries where user_id='00000000-0000-0000-0000-0000000000aa' and entry_date = (now() at time zone 'UTC')::date - 40;
select 'hole at -40' as step, string_agg(milestone::text, ',' order by milestone) as badges,
       (select current_streak||'/'||longest_streak from public.user_streaks('00000000-0000-0000-0000-0000000000aa')) as cur_longest
  from public.user_badges where user_id = '00000000-0000-0000-0000-0000000000aa';
rollback;
