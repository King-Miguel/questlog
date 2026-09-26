import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { fetchQuests, insertQuest, removeQuest, updateQuestStatus } from '@/lib/api';
import { XP_BY_RANK, gameStats, type GameStats, type NewQuestInput, type Quest } from '@/lib/game';
import { useSession } from '@/providers/session';

type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export type ActionResult = { error: string | null };

type QuestsValue = {
  quests: Quest[];
  stats: GameStats;
  status: LoadStatus;
  error: string | null;
  notice: string | null;
  clearNotice: () => void;
  refresh: () => Promise<void>;
  addQuest: (input: NewQuestInput) => Promise<ActionResult>;
  toggleQuest: (quest: Quest) => Promise<ActionResult>;
  deleteQuest: (quest: Quest) => Promise<ActionResult>;
};

const QuestsContext = createContext<QuestsValue | null>(null);

export function useQuests(): QuestsValue {
  const value = useContext(QuestsContext);
  if (!value) throw new Error('useQuests must be used inside <QuestsProvider>');
  return value;
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function QuestsProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;

  const [quests, setQuests] = useState<Quest[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2400);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) {
      setQuests([]);
      setStatus('idle');
      return;
    }
    setStatus((current) => (current === 'ready' ? current : 'loading'));
    setError(null);
    try {
      const rows = await fetchQuests(userId);
      setQuests(rows);
      setStatus('ready');
    } catch (loadError) {
      setError(messageOf(loadError, 'Could not load your quests.'));
      setStatus('error');
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addQuest = useCallback(
    async (input: NewQuestInput): Promise<ActionResult> => {
      if (!userId) return { error: 'You are not signed in.' };
      try {
        const created = await insertQuest(userId, input);
        setQuests((previous) => [created, ...previous]);
        flashNotice(`Quest accepted at rank ${created.difficulty}`);
        return { error: null };
      } catch (addError) {
        return { error: messageOf(addError, 'Could not add that quest.') };
      }
    },
    [userId, flashNotice],
  );

  const toggleQuest = useCallback(
    async (quest: Quest): Promise<ActionResult> => {
      const nextStatus = quest.status === 'done' ? 'open' : 'done';
      const optimistic: Quest = {
        ...quest,
        status: nextStatus,
        xp_awarded: nextStatus === 'done' ? XP_BY_RANK[quest.difficulty] : 0,
        completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
      };

      setQuests((previous) => previous.map((row) => (row.id === quest.id ? optimistic : row)));
      if (nextStatus === 'done') {
        flashNotice(`Quest cleared. +${XP_BY_RANK[quest.difficulty]} XP`);
      }

      try {
        const saved = await updateQuestStatus(quest.id, nextStatus);
        setQuests((previous) => previous.map((row) => (row.id === quest.id ? saved : row)));
        return { error: null };
      } catch (toggleError) {
        setQuests((previous) => previous.map((row) => (row.id === quest.id ? quest : row)));
        return { error: messageOf(toggleError, 'Could not update that quest.') };
      }
    },
    [flashNotice],
  );

  const deleteQuest = useCallback(
    async (quest: Quest): Promise<ActionResult> => {
      const snapshot = quests;
      setQuests((previous) => previous.filter((row) => row.id !== quest.id));
      try {
        await removeQuest(quest.id);
        return { error: null };
      } catch (deleteError) {
        setQuests(snapshot);
        return { error: messageOf(deleteError, 'Could not delete that quest.') };
      }
    },
    [quests],
  );

  const stats = useMemo(() => gameStats(quests), [quests]);

  const value = useMemo<QuestsValue>(
    () => ({
      quests,
      stats,
      status,
      error,
      notice,
      clearNotice: () => setNotice(null),
      refresh,
      addQuest,
      toggleQuest,
      deleteQuest,
    }),
    [quests, stats, status, error, notice, refresh, addQuest, toggleQuest, deleteQuest],
  );

  return <QuestsContext.Provider value={value}>{children}</QuestsContext.Provider>;
}
