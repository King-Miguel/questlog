-- ============================================================================
-- QuestLog demo data
--
-- Run this AFTER you have created a demo user with the email below.
-- Easiest way: Dashboard > Authentication > Users > Add user > Create new user.
--   email:    demo@questlog.app
--   password: pick one, then put it in .env as EXPO_PUBLIC_DEMO_PASSWORD
--   tick "Auto Confirm User" so the account can log in immediately
--
-- This script wipes the demo account's quests and rebuilds a realistic save
-- file: a 7 day streak, level 4, a few open quests and one overdue quest.
-- It only ever touches the demo account, so it is safe to re-run.
-- ============================================================================

do $$
declare
  demo_id   uuid;
  demo_name text;
begin
  select id
    into demo_id
    from auth.users
   where lower(email) = 'demo@questlog.app'
   limit 1;

  if demo_id is null then
    raise exception 'No user with email demo@questlog.app. Create it first in Authentication > Users.';
  end if;

  demo_name := coalesce(
    (select nullif(btrim(display_name), '') from public.profiles where id = demo_id),
    'Demo Adventurer'
  );

  insert into public.profiles (id, display_name)
  values (demo_id, demo_name)
  on conflict (id) do update set display_name = excluded.display_name;

  delete from public.quests where user_id = demo_id;

  -- ---------------------------------------------------------------------
  -- Completed quests. One or more per day for the last 7 days gives the
  -- demo account a live streak. The older entries add XP for the level.
  -- ---------------------------------------------------------------------
  insert into public.quests (user_id, title, difficulty, status, completed_at, notes)
  values
    (demo_id, 'Review data structures notes',        'C', 'done', now(),                            null),
    (demo_id, 'Walk 30 minutes',                     'D', 'done', now(),                            null),
    (demo_id, 'Draft QuestLog README',               'B', 'done', now() - interval '1 day',         'Screenshots still missing'),
    (demo_id, 'Fix tab bar spacing on Android',      'D', 'done', now() - interval '2 days',        null),
    (demo_id, 'Study Supabase row level security',   'C', 'done', now() - interval '3 days',        null),
    (demo_id, 'Answer 2 practice interview sets',    'C', 'done', now() - interval '3 days',        null),
    (demo_id, 'Build quests CRUD screen',            'B', 'done', now() - interval '4 days',        null),
    (demo_id, 'Design QuestLog color system',        'A', 'done', now() - interval '5 days',        'Dark slate plus gold accent'),
    (demo_id, 'Set up Expo Router file structure',   'D', 'done', now() - interval '6 days',        null),
    (demo_id, 'Write system architecture diagram',   'B', 'done', now() - interval '8 days',        null),
    (demo_id, 'Clean up old portfolio screenshots',  'C', 'done', now() - interval '8 days',        null),
    (demo_id, 'Present capstone progress update',    'A', 'done', now() - interval '10 days',       null),
    (demo_id, 'Set up Supabase project',             'B', 'done', now() - interval '12 days',       null),
    (demo_id, 'Pick final project stack',            'C', 'done', now() - interval '14 days',       null);

  -- ---------------------------------------------------------------------
  -- Open quests, including one overdue and two due today.
  -- ---------------------------------------------------------------------
  insert into public.quests (user_id, title, difficulty, status, due_date, notes)
  values
    (demo_id, 'Submit defense manuscript draft',    'S', 'open', current_date - 2, 'Chapter 1 to 3 only'),
    (demo_id, 'Record 60 second app demo',          'A', 'open', current_date,     'Phone screen recording'),
    (demo_id, 'Polish profile avatar upload',       'C', 'open', current_date,     null),
    (demo_id, 'Deploy web build to Vercel',         'B', 'open', current_date + 3, 'Custom domain optional'),
    (demo_id, 'Practice defense Q and A',           'A', 'open', current_date + 5, null),
    (demo_id, 'Read one chapter of Clean Code',     'D', 'open', null,            'No deadline, keep it low pressure');
end;
$$;
