-- WinterArc Journal: schema, RLS, streak + badge logic

-- ───────────────────────── profiles ─────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null,
  display_name text,
  bio          text,
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint display_name_len check (display_name is null or char_length(display_name) <= 40),
  constraint bio_len check (bio is null or char_length(bio) <= 160)
);
create unique index profiles_username_key on public.profiles (lower(username));

-- Reject unknown IANA timezones so streak maths can never error out.
create or replace function public.validate_profile_timezone()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then
    raise exception 'invalid_timezone' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger profiles_validate_tz
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

-- ───────────────────────── journal_entries ─────────────────────────
create table public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  entry_date date not null,
  content    text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- one entry per user per day: duplicates are impossible, so streaks can't be inflated
  constraint one_entry_per_day unique (user_id, entry_date),
  constraint content_len check (char_length(btrim(content)) between 1 and 2000)
);
create index journal_entries_date_idx on public.journal_entries (entry_date, created_at desc);
create index journal_entries_user_idx on public.journal_entries (user_id, entry_date desc);

-- Write window: an entry can only be created for today (in the author's own
-- timezone) or the previous 7 days. The date of an entry never changes.
create or replace function public.enforce_entry_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_today date;
begin
  if tg_op = 'UPDATE' then
    if new.entry_date <> old.entry_date or new.user_id <> old.user_id then
      raise exception 'entry_date_immutable' using errcode = '22023';
    end if;
    new.created_at := old.created_at;
    new.updated_at := now();
    return new;
  end if;

  select (now() at time zone p.timezone)::date into v_today
    from public.profiles p where p.id = new.user_id;
  if new.entry_date > v_today then
    raise exception 'entry_in_future' using errcode = '22023';
  end if;
  if new.entry_date < v_today - 7 then
    raise exception 'entry_too_old' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger journal_entries_rules
  before insert or update on public.journal_entries
  for each row execute function public.enforce_entry_rules();

-- ───────────────────────── badges ─────────────────────────
create table public.user_badges (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  milestone  int  not null,
  earned_at  timestamptz not null default now(),
  primary key (user_id, milestone),
  constraint milestone_valid check (milestone in (5, 10, 20, 35, 50, 75, 100))
);

-- ───────────────────────── streaks ─────────────────────────
-- Gaps-and-islands over DISTINCT dates. "Today" is evaluated in the user's own
-- timezone; a streak stays alive until the end of the day after the last entry.
create or replace function public.user_streaks(p_user uuid)
returns table (total int, current_streak int, longest_streak int, last_entry date, wrote_today boolean)
language sql stable set search_path = public as $$
  with d as (
    select distinct entry_date from public.journal_entries where user_id = p_user
  ),
  g as (
    select entry_date, entry_date - (row_number() over (order by entry_date))::int as grp from d
  ),
  islands as (
    select max(entry_date) as e, count(*)::int as n from g group by grp
  ),
  t as (
    select (now() at time zone coalesce((select timezone from public.profiles where id = p_user), 'UTC'))::date as today
  )
  select
    (select count(*) from d)::int,
    coalesce((select n from islands, t where e >= t.today - 1 order by e desc limit 1), 0),
    coalesce((select max(n) from islands), 0),
    (select max(entry_date) from d),
    exists (select 1 from d, t where d.entry_date = t.today)
$$;

-- Keep badges equal to the milestones covered by the longest streak.
create or replace function public.sync_badges(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_longest int;
begin
  select longest_streak into v_longest from public.user_streaks(p_user);
  insert into public.user_badges (user_id, milestone)
    select p_user, m from unnest(array[5, 10, 20, 35, 50, 75, 100]) as m
    where m <= v_longest
    on conflict do nothing;
  delete from public.user_badges where user_id = p_user and milestone > v_longest;
end $$;

create or replace function public.trg_sync_badges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.sync_badges(coalesce(new.user_id, old.user_id));
  return null;
end $$;

create trigger journal_entries_badges
  after insert or delete on public.journal_entries
  for each row execute function public.trg_sync_badges();

revoke all on function public.sync_badges(uuid) from public, anon, authenticated;
revoke all on function public.trg_sync_badges() from public, anon, authenticated;
revoke all on function public.enforce_entry_rules() from public, anon, authenticated;

-- Per-day entry counts for the global calendar.
create or replace function public.calendar_counts(p_from date, p_to date)
returns table (entry_date date, entries int)
language sql stable set search_path = public as $$
  select entry_date, count(*)::int from public.journal_entries
  where entry_date between p_from and p_to
  group by entry_date
$$;

-- ───────────────────────── new-user profile ─────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_tz   text := coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC');
begin
  if v_name !~ '^[a-z0-9_]{3,20}$' or exists (select 1 from public.profiles where lower(username) = v_name) then
    v_name := 'arc_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  if not exists (select 1 from pg_timezone_names where name = v_tz) then
    v_tz := 'UTC';
  end if;
  insert into public.profiles (id, username, timezone) values (new.id, v_name, v_tz);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── RLS ─────────────────────────
alter table public.profiles        enable row level security;
alter table public.journal_entries enable row level security;
alter table public.user_badges     enable row level security;

-- Everything is public to read (the product is a public journal).
create policy "profiles are public"  on public.profiles        for select using (true);
create policy "entries are public"   on public.journal_entries for select using (true);
create policy "badges are public"    on public.user_badges     for select using (true);

-- Profiles are created by trigger; owners may only update their own row.
create policy "update own profile" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Entries: owners only.
create policy "insert own entries" on public.journal_entries
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own entries" on public.journal_entries
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "delete own entries" on public.journal_entries
  for delete to authenticated using (user_id = (select auth.uid()));

-- Explicit grants (new Supabase projects don't auto-grant table privileges to the API roles).
-- Least privilege: badges are system-managed (read-only for clients); profiles and
-- entries can only have their editable columns updated; usernames/dates are immutable.
revoke all on public.profiles, public.journal_entries, public.user_badges from anon, authenticated;
grant select on public.profiles, public.journal_entries, public.user_badges to anon, authenticated;
grant update (display_name, bio, timezone) on public.profiles to authenticated;
grant insert, delete on public.journal_entries to authenticated;
grant update (content) on public.journal_entries to authenticated;
grant all on public.profiles, public.journal_entries, public.user_badges to service_role;

grant execute on function public.user_streaks(uuid) to anon, authenticated;
grant execute on function public.calendar_counts(date, date) to anon, authenticated;
