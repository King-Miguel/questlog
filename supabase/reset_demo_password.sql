-- Last resort. Prefer Authentication > Users in the Dashboard.
-- Use this only if the Dashboard will not let you change the password.
-- It writes a proper bcrypt hash. Never set encrypted_password to plain text.
-- Change new_password below if you want something else. Safe to re-run.

do $$
declare
  target_email text := 'demo@questlog.app';
  new_password text := 'QuestLog2026!';
  prefix text := '';
  affected integer := 0;
begin
  if not exists (select 1 from auth.users where lower(email) = lower(target_email)) then
    raise exception 'No auth user with email %. Create it in Authentication > Users first.', target_email;
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'crypt' and n.nspname = 'extensions'
  ) then
    prefix := 'extensions.';
  end if;

  execute format(
    'update auth.users
        set encrypted_password = %1$scrypt(%2$L, %1$sgen_salt(''bf'', 10)),
            email_confirmed_at = coalesce(email_confirmed_at, now()),
            updated_at = now()
      where lower(email) = lower(%3$L)',
    prefix,
    new_password,
    target_email
  );

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'Password reset did not match any user.';
  end if;
end $$;

select
  id,
  email,
  (email_confirmed_at is not null) as confirmed,
  left(encrypted_password, 7) as hash_prefix,
  updated_at
from auth.users
where lower(email) = 'demo@questlog.app';
