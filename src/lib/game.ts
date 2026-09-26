export type Rank = 'D' | 'C' | 'B' | 'A' | 'S';
export type QuestStatus = 'open' | 'done';

export type Quest = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  difficulty: Rank;
  due_date: string | null;
  status: QuestStatus;
  xp_awarded: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type NewQuestInput = {
  title: string;
  difficulty: Rank;
  due_date: string | null;
  notes?: string | null;
};

export const RANKS: Rank[] = ['D', 'C', 'B', 'A', 'S'];

/** XP awarded for clearing a quest, mirrored from public.xp_for_rank() in Postgres. */
export const XP_BY_RANK: Record<Rank, number> = {
  D: 10,
  C: 25,
  B: 50,
  A: 100,
  S: 250,
};

export const RANK_HINT: Record<Rank, string> = {
  D: 'Small chore',
  C: 'Normal task',
  B: 'Real work',
  A: 'Big push',
  S: 'Milestone',
};

/**
 * Total XP needed to be *at* a given level.
 * Level 1 starts at 0 XP. Each level costs 50 XP more than the last.
 * Level 2 = 100, Level 3 = 250, Level 4 = 450, Level 5 = 700, Level 6 = 1000.
 */
export function xpToReachLevel(level: number): number {
  const n = Math.max(0, level - 1);
  return 100 * n + 25 * n * (n - 1);
}

export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (xp >= xpToReachLevel(level + 1)) {
    level += 1;
  }
  return level;
}

const LEVEL_TITLES: Array<[number, string]> = [
  [20, 'Ascendant'],
  [15, 'Grandmaster'],
  [12, 'Warlord'],
  [9, 'Champion'],
  [6, 'Knight'],
  [4, 'Adventurer'],
  [2, 'Apprentice'],
  [1, 'Novice'],
];

export function levelTitle(level: number): string {
  for (const [minLevel, title] of LEVEL_TITLES) {
    if (level >= minLevel) return title;
  }
  return 'Novice';
}

export type LevelProgress = {
  level: number;
  title: string;
  totalXp: number;
  xpIntoLevel: number;
  xpForThisLevel: number;
  xpToNextLevel: number;
  percent: number;
};

export function levelProgress(totalXp: number): LevelProgress {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = levelFromXp(xp);
  const floor = xpToReachLevel(level);
  const ceiling = xpToReachLevel(level + 1);
  const xpForThisLevel = ceiling - floor;
  const xpIntoLevel = xp - floor;
  return {
    level,
    title: levelTitle(level),
    totalXp: xp,
    xpIntoLevel,
    xpForThisLevel,
    xpToNextLevel: Math.max(0, ceiling - xp),
    percent: xpForThisLevel === 0 ? 0 : Math.min(1, xpIntoLevel / xpForThisLevel),
  };
}

/** Local calendar day as YYYY-MM-DD, so streaks follow the user's own clock. */
export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function completedDaySet(completedAts: Array<string | null>): Set<string> {
  const days = new Set<string>();
  for (const value of completedAts) {
    if (!value) continue;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) continue;
    days.add(dayKey(parsed));
  }
  return days;
}

/**
 * Consecutive days with at least one cleared quest, ending today.
 * A day that is still in progress does not break the streak: if nothing is
 * cleared yet today, the chain is measured up to yesterday instead.
 */
export function currentStreak(completedAts: Array<string | null>, now: Date = new Date()): number {
  const days = completedDaySet(completedAts);
  if (days.size === 0) return 0;

  let cursor = new Date(now.getTime());
  if (!days.has(dayKey(cursor))) {
    cursor = shiftDays(cursor, -1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(completedAts: Array<string | null>): number {
  const days = [...completedDaySet(completedAts)].sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;

  for (const day of days) {
    if (previous === null) {
      run = 1;
    } else {
      const previousDate = new Date(`${previous}T00:00:00`);
      const expected = dayKey(shiftDays(previousDate, 1));
      run = expected === day ? run + 1 : 1;
    }
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

export type DueState = 'none' | 'overdue' | 'today' | 'tomorrow' | 'soon' | 'later';

export function dueState(dueDate: string | null, now: Date = new Date()): DueState {
  if (!dueDate) return 'none';
  const today = dayKey(now);
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  if (dueDate === dayKey(shiftDays(now, 1))) return 'tomorrow';
  if (dueDate <= dayKey(shiftDays(now, 6))) return 'soon';
  return 'later';
}

const DUE_SORT_WEIGHT: Record<DueState, number> = {
  overdue: 0,
  today: 1,
  tomorrow: 2,
  soon: 3,
  later: 4,
  none: 5,
};

/** Open quests first: overdue, then due today, then the rest, newest last. */
export function sortQuestList(quests: Quest[], now: Date = new Date()): Quest[] {
  return [...quests].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    if (a.status === 'done') {
      return (b.completed_at ?? '').localeCompare(a.completed_at ?? '');
    }
    const weight = DUE_SORT_WEIGHT[dueState(a.due_date, now)] - DUE_SORT_WEIGHT[dueState(b.due_date, now)];
    if (weight !== 0) return weight;
    return b.created_at.localeCompare(a.created_at);
  });
}

export type GameStats = {
  totalXp: number;
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForThisLevel: number;
  xpToNextLevel: number;
  percent: number;
  streak: number;
  longestStreak: number;
  cleared: number;
  open: number;
  overdue: number;
  dueToday: number;
  completionRate: number;
  byRank: Record<Rank, { cleared: number; open: number; xp: number }>;
};

export function gameStats(quests: Quest[], now: Date = new Date()): GameStats {
  const completedAts = quests.filter((q) => q.status === 'done').map((q) => q.completed_at);
  const totalXp = quests.reduce((sum, q) => sum + (q.status === 'done' ? q.xp_awarded : 0), 0);
  const progress = levelProgress(totalXp);

  const byRank = RANKS.reduce(
    (acc, rank) => {
      acc[rank] = { cleared: 0, open: 0, xp: 0 };
      return acc;
    },
    {} as GameStats['byRank'],
  );

  for (const quest of quests) {
    const bucket = byRank[quest.difficulty];
    if (!bucket) continue;
    if (quest.status === 'done') {
      bucket.cleared += 1;
      bucket.xp += quest.xp_awarded;
    } else {
      bucket.open += 1;
    }
  }

  const cleared = quests.filter((q) => q.status === 'done').length;
  const openQuests = quests.filter((q) => q.status === 'open');

  return {
    ...progress,
    streak: currentStreak(completedAts, now),
    longestStreak: longestStreak(completedAts),
    cleared,
    open: openQuests.length,
    overdue: openQuests.filter((q) => dueState(q.due_date, now) === 'overdue').length,
    dueToday: openQuests.filter((q) => dueState(q.due_date, now) === 'today').length,
    completionRate: quests.length === 0 ? 0 : cleared / quests.length,
    byRank,
  };
}

export function formatDueLabel(dueDate: string | null, now: Date = new Date()): string | null {
  if (!dueDate) return null;
  const state = dueState(dueDate, now);
  const [year, month, day] = dueDate.split('-');
  const short = `${day}/${month}`;

  switch (state) {
    case 'overdue':
      return `Overdue - ${short}`;
    case 'today':
      return 'Due today';
    case 'tomorrow':
      return 'Due tomorrow';
    default:
      return `Due ${short}${year && year !== String(now.getFullYear()) ? `/${year}` : ''}`;
  }
}

export function initialsFromName(name: string | null | undefined, fallback = '?'): string {
  const clean = (name ?? '').trim();
  if (!clean) return fallback;
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('');
}
