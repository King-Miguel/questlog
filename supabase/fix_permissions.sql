-- QuestLog permission repair. Safe to re-run any time.
-- Fixes: "permission denied for table quests" / "profiles".
-- Paste the whole file into Supabase SQL Editor and run.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on public.profiles to anon, authenticated;
grant select, insert, update, delete on public.quests to anon, authenticated;
grant all on public.profiles to service_role;
grant all on public.quests to service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- Future tables created from the SQL Editor inherit these grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.quests enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "quests_select_own" on public.quests;
create policy "quests_select_own" on public.quests
  for select using (auth.uid() = user_id);

drop policy if exists "quests_insert_own" on public.quests;
create policy "quests_insert_own" on public.quests
  for insert with check (auth.uid() = user_id);

drop policy if exists "quests_update_own" on public.quests;
create policy "quests_update_own" on public.quests
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "quests_delete_own" on public.quests;
create policy "quests_delete_own" on public.quests
  for delete using (auth.uid() = user_id);

-- Verification. Every cell below should be true.
select
  has_table_privilege('authenticated', 'public.profiles', 'SELECT') as profiles_read,
  has_table_privilege('authenticated', 'public.profiles', 'INSERT') as profiles_insert,
  has_table_privilege('authenticated', 'public.quests', 'SELECT') as quests_read,
  has_table_privilege('authenticated', 'public.quests', 'INSERT') as quests_insert,
  has_table_privilege('authenticated', 'public.quests', 'UPDATE') as quests_update,
  has_table_privilege('authenticated', 'public.quests', 'DELETE') as quests_delete;

select tablename, count(*) as policies
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'quests')
group by tablename
order by tablename;
