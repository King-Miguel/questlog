import { supabase } from './supabase';
import { RANKS, type NewQuestInput, type Profile, type Quest, type QuestStatus, type Rank } from './game';

const PROFILE_COLUMNS = 'id, display_name, avatar_url, created_at, updated_at';
const QUEST_COLUMNS =
  'id, user_id, title, notes, difficulty, due_date, status, xp_awarded, completed_at, created_at, updated_at';

export type QuestPlanSuggestion = {
  title: string;
  notes: string | null;
  difficulty: Rank;
  due_in_days: number | null;
};

export type QuestPlan = {
  planId: string;
  quests: QuestPlanSuggestion[];
  horizonDays: number;
};

export type AiInsights = {
  plans: number;
  suggested: number;
  accepted: number;
  acceptanceRate: number;
};

function wrapError(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown error'}`);
}

function questPayload(userId: string, input: NewQuestInput): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    title: input.title.trim(),
    difficulty: input.difficulty,
    due_date: input.due_date,
    notes: input.notes?.trim() ? input.notes.trim() : null,
  };

  if (input.ai_generated) {
    payload.ai_generated = true;
    payload.ai_plan_id = input.ai_plan_id ?? null;
  }

  return payload;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) wrapError('Could not load profile', error);
  return (data as Profile | null) ?? null;
}

export async function ensureProfile(userId: string, fallbackName?: string | null): Promise<Profile> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, display_name: fallbackName ?? null })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) wrapError('Could not create profile', error);
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: { display_name?: string | null; avatar_url?: string | null },
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) wrapError('Could not save profile', error);
  return data as Profile;
}

export async function fetchQuests(userId: string): Promise<Quest[]> {
  const { data, error } = await supabase
    .from('quests')
    .select(QUEST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) wrapError('Could not load quests', error);
  return (data ?? []) as Quest[];
}

export async function insertQuest(userId: string, input: NewQuestInput): Promise<Quest> {
  const { data, error } = await supabase
    .from('quests')
    .insert(questPayload(userId, input))
    .select(QUEST_COLUMNS)
    .single();

  if (error) wrapError('Could not add quest', error);
  return data as Quest;
}

export async function insertQuests(userId: string, inputs: NewQuestInput[]): Promise<Quest[]> {
  const { data, error } = await supabase
    .from('quests')
    .insert(inputs.map((input) => questPayload(userId, input)))
    .select(QUEST_COLUMNS);

  if (error) wrapError('Could not accept the questline', error);
  return (data ?? []) as Quest[];
}

export async function updateQuestStatus(questId: string, status: QuestStatus): Promise<Quest> {
  const { data, error } = await supabase
    .from('quests')
    .update({ status })
    .eq('id', questId)
    .select(QUEST_COLUMNS)
    .single();

  if (error) wrapError('Could not update quest', error);
  return data as Quest;
}

export async function removeQuest(questId: string): Promise<void> {
  const { error } = await supabase.from('quests').delete().eq('id', questId);
  if (error) wrapError('Could not delete quest', error);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRank(value: unknown): value is Rank {
  return typeof value === 'string' && RANKS.includes(value as Rank);
}

function readFunctionError(error: unknown): { message: string; status?: number } {
  if (!isRecord(error)) return { message: 'The AI planner is unavailable right now.' };
  const context = error.context;
  const status = isRecord(context) && typeof context.status === 'number' ? context.status : undefined;
  const message = typeof error.message === 'string' ? error.message : 'The AI planner is unavailable right now.';
  return { message, status };
}

function validateQuestPlan(value: unknown): QuestPlan {
  if (!isRecord(value) || typeof value.planId !== 'string' || !value.planId) {
    throw new Error('The planner returned an invalid plan. Please try again.');
  }

  const horizonDays = Number(value.horizonDays);
  if (!Number.isInteger(horizonDays) || horizonDays < 1 || horizonDays > 90) {
    throw new Error('The planner returned an invalid time horizon. Please try again.');
  }

  if (!Array.isArray(value.quests) || value.quests.length < 3 || value.quests.length > 6) {
    throw new Error('The planner returned an incomplete questline. Please try again.');
  }

  const quests: QuestPlanSuggestion[] = [];
  const titles = new Set<string>();
  for (const item of value.quests) {
    if (!isRecord(item) || typeof item.title !== 'string') {
      throw new Error('The planner returned an invalid quest. Please try again.');
    }

    const title = item.title.trim();
    const titleKey = title.toLocaleLowerCase();
    if (!title || title.length > 140 || titles.has(titleKey)) {
      throw new Error('The planner returned an invalid quest title. Please try again.');
    }
    if (!isRank(item.difficulty)) {
      throw new Error('The planner returned an invalid quest rank. Please try again.');
    }

    let dueInDays: number | null = null;
    if (item.due_in_days !== null) {
      if (
        typeof item.due_in_days !== 'number' ||
        !Number.isInteger(item.due_in_days) ||
        item.due_in_days < 0 ||
        item.due_in_days > horizonDays
      ) {
        throw new Error('The planner returned an invalid due date. Please try again.');
      }
      dueInDays = item.due_in_days;
    }

    let notes: string | null = null;
    if (item.notes !== null) {
      if (typeof item.notes !== 'string' || item.notes.trim().length > 280) {
        throw new Error('The planner returned invalid quest notes. Please try again.');
      }
      notes = item.notes.trim() || null;
    }

    titles.add(titleKey);
    quests.push({ title, notes, difficulty: item.difficulty, due_in_days: dueInDays });
  }

  return { planId: value.planId, quests, horizonDays };
}

export async function generateQuestPlan(goal: string, horizonDays: number): Promise<QuestPlan> {
  const cleanGoal = goal.trim();
  if (cleanGoal.length < 4) throw new Error('Describe your goal in a few words.');
  if (cleanGoal.length > 300) throw new Error('Keep the goal under 300 characters.');

  const { data, error } = await supabase.functions.invoke('quest-scribe', {
    body: { goal: cleanGoal, horizonDays },
  });

  if (error) {
    const functionError = readFunctionError(error);
    if (functionError.status === 401) throw new Error('Sign in again before using Quest Scribe.');
    if (functionError.status === 429) {
      throw new Error('Your daily Quest Scribe limit is reached. Try again tomorrow.');
    }
    if (functionError.status === 503) {
      throw new Error('Quest Scribe is not ready yet. Finish the AI setup steps first.');
    }
    if (functionError.status === 502) {
      throw new Error('The planner could not make a clean questline. Try a more specific goal.');
    }
    const lowerMessage = functionError.message.toLowerCase();
    if (
      lowerMessage.includes('failed to send a request') ||
      lowerMessage.includes('failed to fetch') ||
      lowerMessage.includes('network')
    ) {
      throw new Error(
        'Quest Scribe could not reach its planner. Deploy the quest-scribe Edge Function in Supabase, then try again.',
      );
    }
    throw new Error(functionError.message || 'The AI planner is unavailable right now.');
  }

  return validateQuestPlan(data);
}

export async function fetchAiInsights(): Promise<AiInsights> {
  const [requestsResult, acceptedResult] = await Promise.all([
    supabase.from('ai_requests').select('suggested'),
    supabase.from('quests').select('id', { count: 'exact', head: true }).eq('ai_generated', true),
  ]);

  if (requestsResult.error) wrapError('Could not load AI metrics', requestsResult.error);
  if (acceptedResult.error) wrapError('Could not load AI metrics', acceptedResult.error);

  const suggested = (requestsResult.data ?? []).reduce(
    (total, row) => total + (typeof row.suggested === 'number' ? row.suggested : 0),
    0,
  );
  const accepted = acceptedResult.count ?? 0;

  return {
    plans: requestsResult.data?.length ?? 0,
    suggested,
    accepted,
    acceptanceRate: suggested === 0 ? 0 : accepted / suggested,
  };
}

export function describeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'Wrong email or password.';
  if (lower.includes('email not confirmed')) {
    return 'This email is not confirmed yet. Confirm it, or turn off email confirmation in Supabase.';
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'That email already has an account. Try signing in instead.';
  }
  if (lower.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Could not reach Supabase. Check your connection and your project URL.';
  }
  return message;
}
