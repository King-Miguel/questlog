-- ============================================================================
-- QuestLog schema
-- Run this once in Supabase Dashboard > SQL Editor > New query > Run.
-- Safe to re-run: every object is created with IF NOT EXISTS / OR REPLACE.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- XP curve
-- D = 10, C = 25, B = 50, A = 100, S = 250
-- Lives in the database so the client can never inflate XP by editing a row.
-- ---------------------------------------------------------------------------
create or replace function public.xp_for_rank(rank text)
returns integer
language sql
immutable
as $$
  select case upper(coalesce(rank, 'D'))
    when 'D' then 10
    when 'C' then 25
    when 'B' then 50
    when 'A' then 100
    when 'S' then 250
    else 10
  end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- One row per auth user. Created automatically by the trigger below.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint profiles_display_name_len check (
    display_name is null or char_length(display_name) <= 60
  )
);

-- ---------------------------------------------------------------------------
-- quests
-- A real life task. Completing it is what awards XP.
-- ---------------------------------------------------------------------------
create table if not exists public.quests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null,
  notes        text,
  difficulty   text not null default 'C',
  due_date     date,
  status       text not null default 'open',
  xp_awarded   integer not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint quests_difficulty_valid check (difficulty in ('D', 'C', 'B', 'A', 'S')),
  constraint quests_status_valid check (status in ('open', 'done')),
  constraint quests_title_len check (char_length(btrim(title)) between 1 and 140),
  constraint quests_xp_non_negative check (xp_awarded >= 0)
);

create index if not exists quests_user_status_idx on public.quests (user_id, status);
create index if not exists quests_user_completed_idx on public.quests (user_id, completed_at desc);
create index if not exists quests_user_due_idx on public.quests (user_id, due_date);

-- ---------------------------------------------------------------------------
-- updated_at bookkeeping
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists quests_touch_updated_at on public.quests;
create trigger quests_touch_updated_at
  before update on public.quests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Award / revoke XP whenever a quest flips between open and done.
-- Reopening a quest takes its XP back, so totals always match reality.
-- ---------------------------------------------------------------------------
create or replace function public.apply_quest_progress()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' then
    if new.xp_awarded = 0 then
      new.xp_awarded := public.xp_for_rank(new.difficulty);
    end if;
    if new.completed_at is null then
      new.completed_at := now();
    end if;
  else
    new.xp_awarded := 0;
    new.completed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists quests_apply_progress on public.quests;
create trigger quests_apply_progress
  before insert or update on public.quests
  for each row execute function public.apply_quest_progress();

-- ---------------------------------------------------------------------------
-- Give every new signup a profile row.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security: you can only ever touch your own rows.
-- ---------------------------------------------------------------------------
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
