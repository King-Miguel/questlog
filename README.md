# QuestLog

Real life tasks are quests. Clear them, earn XP, level up, keep the streak alive.

A personal habit and goal tracker with a light RPG skin. Built with Expo, React Native, Expo Router, TypeScript and Supabase, and shipped as a phone app plus a web build you can open in a browser.

## What it does

- **Accounts** - email and password sign up and sign in through Supabase Auth, with a session that survives app restarts.
- **Quests** - create, complete, reopen and delete quests. Each one has a title, an optional due date and a difficulty rank from D to S.
- **XP and levels** - clearing a quest awards XP based on its rank. XP is calculated inside Postgres, so the number on screen always matches what you actually cleared.
- **Streak** - consecutive days with at least one cleared quest. A day that is still in progress never breaks the chain.
- **Stats** - level, XP bar, current and best streak, clear rate and the XP split across ranks.
- **Profile** - display name per account, plus a demo account for anyone reviewing the project.
- **Privacy** - every row is scoped to its owner by Postgres Row Level Security. Nobody can read or write another account's quests, even with the public key in hand.

## Stack

| Layer | Choice |
| --- | --- |
| App | Expo SDK 57, React Native 0.86, TypeScript |
| Navigation | Expo Router (file based routes) |
| Backend | Supabase Auth, Postgres, Row Level Security |
| Styling | React Native StyleSheet with a small shared theme |
| Web build | Expo web export (single page app) deployed to Vercel |
| Android build | EAS Build, when a preview APK is needed |

No custom fonts, no UI kit, no animation library. Every visual component lives in this repo and can be explained line by line.

## Quick start (Windows CMD)

```
npm install
copy .env.example .env
notepad .env
```

Fill in the two Supabase values, then start the app:

```
npx expo start --tunnel --clear
```

Press `w` for the browser, or scan the QR code with Expo Go on Android. Tunnel mode works even when the phone and the laptop are on different networks.

Other scripts:

```
npm run typecheck
npm run build:web
```

## Supabase setup

Do this once per project.

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it. It creates the tables, the XP rules, the triggers and the RLS policies, and it is safe to run again.
3. Open **Authentication > Sign In / Providers > Email** and turn **Confirm email** off. Without this, new accounts have to click a link before they can sign in.
4. Optional demo account: **Authentication > Users > Add user > Create new user**, email `demo@questlog.app`, a password of your choice, and tick **Auto Confirm User**.
5. Optional demo data: paste `supabase/seed_demo.sql` into the SQL Editor and run it. It rebuilds the demo account with a 7 day streak, level 4 and a mix of open quests.
6. Copy **Project URL** and the **anon** or **publishable** key from **Project Settings > API Keys** into `.env`.

Then restart the dev server. Expo reads `EXPO_PUBLIC_` values at build time, so editing `.env` while Metro is running changes nothing until you restart.

## XP rules

| Rank | Meaning | XP |
| --- | --- | --- |
| D | Small chore | 10 |
| C | Normal task | 25 |
| B | Real work | 50 |
| A | Big push | 100 |
| S | Milestone | 250 |

Total XP needed to reach level N is `100 * (N - 1) + 25 * (N - 1) * (N - 2)`:

| Level | 2 | 3 | 4 | 5 | 6 | 7 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Total XP | 100 | 250 | 450 | 700 | 1000 | 1350 | 2700 |

Two rules keep the numbers honest:

- The XP for a cleared quest is written by a Postgres trigger (`apply_quest_progress`), not by the app. Reopening a quest takes the XP back.
- Deleting a cleared quest removes the XP it earned, because totals are summed from the quests table.

Streaks are computed from the completion timestamps in the user's own timezone: count backwards from today while each day has at least one cleared quest. If nothing is cleared yet today, the count starts from yesterday, so an unfinished day does not kill the streak.

## Project structure

```
src/app/            Expo Router routes
  _layout.tsx       root stack, session provider, protected route groups
  index.tsx         entry redirect: signed out goes to /login
  (auth)/           login and register
  (tabs)/           home, quests, stats, profile
src/components/     shared UI and game components
src/lib/            game rules, Supabase client, API calls, theme, storage
src/providers/      session state and quest state
supabase/           schema.sql and seed_demo.sql
```

## Security model

- `.env` is gitignored. Only `.env.example` is committed.
- The anon or publishable key is meant to be public. Row Level Security is what protects the data, and every policy checks `auth.uid()` against the row owner.
- The `service_role` key is never used in the app and never belongs in `.env`.
- The database rejects bad input: difficulty must be D, C, B, A or S, status must be open or done, and titles are limited to 140 characters. XP is clamped to non-negative values.
- The demo account is a shared login on purpose. Treat it as a sandbox: anyone who uses it can add quests to it.

## Deploy the web build

The repository includes `vercel.json`, which runs `npx expo export --platform web` and serves `dist` as a single page app.

1. Push this repository to GitHub.
2. In Vercel, **Add New Project** and import the repository.
3. Add the environment variables `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` under **Project Settings > Environment Variables**.
4. Deploy.

After that, adding a `?email=` style link is unnecessary: the login screen has a one tap demo button whenever `EXPO_PUBLIC_DEMO_EMAIL` and `EXPO_PUBLIC_DEMO_PASSWORD` are set.

## Roadmap

- Avatar upload to Supabase Storage
- Push notification when a daily quest is still open
- Realtime sync between phone and web
- Weekly review screen

## License

MIT. See `LICENSE`.
