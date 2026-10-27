-- Run this in the Supabase project your .env actually points at.
-- If the second result has zero rows, you created the demo user in a
-- different project, or under a slightly different email address.

select current_database() as database, now() as checked_at;

select
  id,
  email,
  (email_confirmed_at is not null) as confirmed,
  email_confirmed_at,
  created_at,
  last_sign_in_at,
  left(encrypted_password, 7) as hash_prefix
from auth.users
where lower(email) like '%demo%'
order by created_at;

select
  (select count(*) from auth.users) as total_auth_users,
  (select count(*) from public.profiles) as total_profiles,
  (select count(*) from public.quests) as total_quests;
