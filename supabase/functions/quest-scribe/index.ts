// QuestLog Quest Scribe. Deploy as a Supabase Edge Function named "quest-scribe".
// Secrets: GEMINI_API_KEY, optional AI_MODEL. No imports, so it pastes straight
// into the Dashboard editor with nothing to install.

type Rank = 'D' | 'C' | 'B' | 'A' | 'S';

type PlannedQuest = {
  title: string;
  notes: string | null;
  difficulty: Rank;
  due_in_days: number | null;
};

const RANKS: Rank[] = ['D', 'C', 'B', 'A', 'S'];
const DAILY_CAP = 8;
const MAX_QUESTS = 6;

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function fail(message: string, status: number): Response {
  return json({ error: message }, status);
}

function project(): { url: string; key: string } {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '');
  const key =
    Deno.env.get('SUPABASE_ANON_KEY') ??
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ??
    '';
  return { url, key };
}

async function readUser(auth: string): Promise<string | null> {
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  const { url, key } = project();
  if (!url || !key) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: auth },
  });
  if (!res.ok) return null;
  try {
    const user = await res.json();
    return typeof user?.id === 'string' ? user.id : null;
  } catch {
    return null;
  }
}

function cleanQuests(raw: unknown, horizon: number): PlannedQuest[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { quests?: unknown })?.quests)
      ? (raw as { quests: unknown[] }).quests
      : [];

  const out: PlannedQuest[] = [];
  for (const entry of list) {
    if (out.length >= MAX_QUESTS) break;
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;

    const title =
      typeof item.title === 'string' ? item.title.trim().replace(/\s+/g, ' ') : '';
    if (!title) continue;

    const wanted =
      typeof item.difficulty === 'string' ? item.difficulty.trim().toUpperCase() : '';
    const difficulty: Rank = RANKS.includes(wanted as Rank) ? (wanted as Rank) : 'C';

    const notes =
      typeof item.notes === 'string' && item.notes.trim()
        ? item.notes.trim().slice(0, 280)
        : null;

    let due_in_days: number | null = null;
    const rawDue = item.due_in_days;
    if (rawDue !== null && rawDue !== undefined && rawDue !== '') {
      const days = Number(rawDue);
      if (Number.isFinite(days) && days >= 0) {
        due_in_days = Math.min(horizon, Math.floor(days));
      }
    }

    out.push({ title: title.slice(0, 140), notes, difficulty, due_in_days });
  }
  return out;
}

const SYSTEM = [
  'You plan quests in QuestLog, a habit tracker where real tasks become RPG quests.',
  'Break one goal into 3 to 6 concrete, small, actionable tasks.',
  'Each task must be something a student can finish in one sitting, not a whole project phase.',
  'Ranks: D = tiny chore (10 XP), C = normal task (25 XP), B = real work (50 XP),',
  'A = big push (100 XP), S = rare milestone (250 XP). Use mostly C and B.',
  'Reserve A and S for genuinely large milestones, at most one S per plan.',
  'due_in_days is an integer from 0 (today) up to the horizon, or null for no deadline.',
  'Spread deadlines out. Do not put every task on day 0.',
  'notes is one short practical hint, or null. Never add motivational filler.',
  'Write in plain English. No em dashes, no emoji, no markdown.',
  'Return JSON only, shaped as {"quests":[{"title":string,"notes":string|null,',
  '"difficulty":"D|C|B|A|S","due_in_days":number|null}]}.',
].join(' ');

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('Use POST.', 405);

  const auth = req.headers.get('Authorization') ?? '';
  const userId = await readUser(auth);
  if (!userId) return fail('Sign in before planning a questline.', 401);

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return fail('The AI planner is not configured yet.', 503);

  let goal = '';
  let horizon = 21;
  try {
    const body = await req.json();
    goal = typeof body?.goal === 'string' ? body.goal.trim().slice(0, 300) : '';
    const asked = Number(body?.horizonDays);
    if (Number.isFinite(asked) && asked > 0) {
      horizon = Math.min(90, Math.max(1, Math.round(asked)));
    }
  } catch {
    return fail('Send a JSON body with a goal.', 400);
  }
  if (goal.length < 4) return fail('Describe your goal in a few words.', 400);

  const { url, key } = project();
  const restHeaders: Record<string, string> = {
    apikey: key,
    Authorization: auth,
    'Content-Type': 'application/json',
  };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const countRes = await fetch(
    `${url}/rest/v1/ai_requests?select=id&user_id=eq.${userId}` +
      `&created_at=gte.${encodeURIComponent(since)}`,
    { headers: { ...restHeaders, Prefer: 'count=exact', Range: '0-0' } },
  );
  if (!countRes.ok) {
    return fail('AI usage table is not ready. Run migrations/002_ai_plan.sql first.', 503);
  }
  const contentRange = countRes.headers.get('content-range') ?? '';
  const used = Number(contentRange.split('/')[1] ?? '0');
  if (Number.isFinite(used) && used >= DAILY_CAP) {
    return fail(`Daily limit of ${DAILY_CAP} plans reached. Try again tomorrow.`, 429);
  }

  const model = (Deno.env.get('AI_MODEL') ?? 'gemini-2.5-flash').trim();
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let quests: PlannedQuest[] = [];
  try {
    const gemini = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `Goal: ${goal}\nHorizon: ${horizon} days\n` +
                  'Return only the JSON object described in your instructions.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1400,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!gemini.ok) {
      const detail = await gemini.text();
      console.error('Gemini failed', gemini.status, detail.slice(0, 600));
      return fail('The planner is unavailable right now. Add quests manually instead.', 502);
    }

    const payload = await gemini.json();
    const parts = payload?.candidates?.[0]?.content?.parts ?? [];
    const rawText = parts.map((p: { text?: string }) => p?.text ?? '').join('');
    const stripped = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    quests = cleanQuests(JSON.parse(stripped), horizon);
  } catch (error) {
    console.error('Quest scribe parse failed', error);
    return fail('The planner returned an unreadable answer. Please try again.', 502);
  }

  if (quests.length === 0) {
    return fail('The planner could not break that goal down. Try a more specific goal.', 502);
  }

  const planId = crypto.randomUUID();
  const logRes = await fetch(`${url}/rest/v1/ai_requests`, {
    method: 'POST',
    headers: { ...restHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({
      id: planId,
      user_id: userId,
      goal,
      suggested: quests.length,
    }),
  });
  if (!logRes.ok) {
    console.error('Could not log AI request', await logRes.text());
    return fail('Could not record the plan. Check the ai_requests policies.', 503);
  }

  return json({ planId, quests, horizonDays: horizon });
});
