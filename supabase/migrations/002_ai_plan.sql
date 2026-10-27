-- Quest Scribe support. Run once in Supabase SQL Editor. Safe to re-run.

alter table public.quests
  add column if not exists ai_generated boolean not null default false,
  add column if not exists ai_plan_id uuid;

create index if not exists quests_ai_plan_idx
  on public.quests (ai_plan_id)
  where ai_plan_id is not null;

create table if not exists public.ai_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  goal        text not null,
  suggested   integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint ai_requests_goal_len check (char_length(goal) between 1 and 300),
  constraint ai_requests_suggested_non_negative check (suggested >= 0)
);

create index if not exists ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at desc);

alter table public.ai_requests enable row level security;

-- Append only on purpose: no UPDATE or DELETE policy, so the daily cap
-- cannot be reset by deleting your own usage rows.
drop policy if exists "ai_requests_select_own" on public.ai_requests;
create policy "ai_requests_select_own" on public.ai_requests
  for select using (auth.uid() = user_id);

drop policy if exists "ai_requests_insert_own" on public.ai_requests;
create policy "ai_requests_insert_own" on public.ai_requests
  for insert with check (auth.uid() = user_id);

grant select, insert on public.ai_requests to authenticated;
grant all on public.ai_requests to service_role;

select
  (select count(*) from public.ai_requests) as logged_plans,
  (select count(*) from public.quests where ai_generated) as ai_quests;
