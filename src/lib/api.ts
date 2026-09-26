import { supabase } from './supabase';
import type { NewQuestInput, Profile, Quest, QuestStatus } from './game';

const PROFILE_COLUMNS = 'id, display_name, avatar_url, created_at, updated_at';
const QUEST_COLUMNS =
  'id, user_id, title, notes, difficulty, due_date, status, xp_awarded, completed_at, created_at, updated_at';

function wrapError(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'unknown error'}`);
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

/**
 * Safety net: if the signup trigger ever fails to create the profile row,
 * the app creates it on first load instead of showing a broken profile tab.
 */
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
    .insert({
      user_id: userId,
      title: input.title.trim(),
      difficulty: input.difficulty,
      due_date: input.due_date,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    })
    .select(QUEST_COLUMNS)
    .single();

  if (error) wrapError('Could not add quest', error);
  return data as Quest;
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
