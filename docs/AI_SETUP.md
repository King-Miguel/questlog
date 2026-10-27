# Quest Scribe setup

Deploys the AI questline planner with a Gemini key held as a Supabase secret.
Nothing here needs the Supabase CLI or Docker, so it works on a laptop with
almost no free space on the system drive.

## What it does

The app sends one goal. The Edge Function checks the caller's session, enforces
a per-user daily cap, asks Gemini for a short list of quests, validates every
field, and returns them. Nothing is written to `quests` until the user reviews
and confirms the list in the app.

## 1. Get a Gemini key

1. Open [Google AI Studio](https://aistudio.google.com/) and sign in.
2. Choose **Get API key**, then **Create API key**.
3. Copy the key. It starts with `AIza`.

Never put this key in `.env`, in any `EXPO_PUBLIC_*` variable, or in Git. It is
a server secret.

## 2. Run the database migration

In Supabase, open **SQL Editor**, paste `supabase/migrations/002_ai_plan.sql`,
and run. It adds `ai_generated` and `ai_plan_id` to `quests`, plus an append
only `ai_requests` table used for the daily cap and acceptance-rate metrics.

If you have not already fixed the table grants, run
`supabase/fix_permissions.sql` first.

## 3. Add the secret

In Supabase, open **Project Settings > Edge Functions > Secrets** (or the
secrets panel under Edge Functions) and add:

```
GEMINI_API_KEY = your-key-from-step-1
```

Optional, only if you want a different model:

```
AI_MODEL = gemini-2.5-flash
```

Check the current model list in Google AI Studio and paste the model ID you
want. Leaving it unset uses `gemini-2.5-flash`.

## 4. Deploy the function

1. In Supabase, open **Edge Functions** in the sidebar.
2. Click **Deploy a new function**, then **Via Editor**.
3. Name it exactly `quest-scribe`.
4. Replace the template code with the entire contents of
   `supabase/functions/quest-scribe/index.ts`.
5. Click **Deploy function** and wait for the success message.

The editor has no version control, so keep the file in this repo as the source
of truth. Redeploy from the repo file after any edit.

## 5. Test it

The function requires a signed-in user token. Get one with the demo account.
In CMD:

```
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/auth/v1/token?grant_type=password" -H "apikey: YOUR_ANON_KEY" -H "Content-Type: application/json" -d "{\"email\":\"demo@questlog.app\",\"password\":\"YOUR_DEMO_PASSWORD\"}"
```

In PowerShell use `curl.exe` instead of `curl`, which is an alias there.
Copy the `access_token` value from the response, then:

```
curl -X POST "https://YOUR_PROJECT_REF.supabase.co/functions/v1/quest-scribe" -H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer PASTE_ACCESS_TOKEN" -H "Content-Type: application/json" -d "{\"goal\":\"Pass my capstone defense in three weeks\",\"horizonDays\":21}"
```

You should get a `planId` and a `quests` array. Each quest has `title`,
`notes`, `difficulty` (D, C, B, A or S) and `due_in_days`.

If the response is `401`, the token is wrong or expired. If it is `503` about
the usage table, the migration did not run. If it is `502`, open the function's
**Logs** tab in Supabase to see what Gemini returned.

## Cost and abuse controls

- `DAILY_CAP = 8` plans per user per 24 hours, enforced against `ai_requests`.
- The usage table has no UPDATE or DELETE policy, so a user cannot clear their
  own history to reset the cap.
- `maxOutputTokens` is capped at 1400 and the model is a small Flash model.
- The shared demo account uses one user ID, so recruiters share one daily cap.
  Raise it deliberately if you expect a lot of traffic on demo day.

## What to measure for your capstone

`ai_requests.suggested` records how many quests were offered.
`quests.ai_plan_id` records which plan an accepted quest came from. Acceptance
rate is the count of quests with a given plan ID divided by that plan's
`suggested` value. That gives you a real result: how often users kept an AI
suggestion, and how often they edited or discarded it.

## What is not built yet

The app-side review dialog and the acceptance-rate tile on the Stats screen are
the next slice. Until then the function is fully testable from the Dashboard and
the app works exactly as before.
