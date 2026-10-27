-- Read only. Run this first if you want to see exactly what is wrong.
-- Paste into Supabase SQL Editor and look at each result tab.

select current_database() as database, current_user as runner;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  pg_get_userbyid(c.relowner) as owner
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('profiles', 'quests', 'ai_requests')
order by c.relname;

select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'quests', 'ai_requests')
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_name, grantee
order by table_name, grantee;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('profiles', 'quests', 'ai_requests')
order by tablename, policyname;

select
  u.id,
  u.email,
  to_jsonb(u) ->> 'email_confirmed_at' as email_confirmed_at,
  to_jsonb(u) ->> 'created_at' as created_at,
  to_jsonb(u) ->> 'last_sign_in_at' as last_sign_in_at
from auth.users as u
where lower(u.email) = 'demo@questlog.app';

select count(*) as quest_rows from public.quests;
select count(*) as profile_rows from public.profiles;
