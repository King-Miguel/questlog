import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlayerPanel, QuestCard, StatTile } from '@/components/game-ui';
import { Button, EmptyState, InlineNote, LoadingScreen, Panel, Screen, SectionTitle } from '@/components/ui';
import { sortQuestList } from '@/lib/game';
import { palette, spacing, text } from '@/lib/theme';
import { useQuests } from '@/providers/quests';

export default function HomeScreen() {
  const { quests, stats, status, error, refresh, toggleQuest, deleteQuest } = useQuests();

  const activeQuests = useMemo(
    () => sortQuestList(quests).filter((quest) => quest.status === 'open'),
    [quests],
  );
  const preview = activeQuests.slice(0, 4);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  if (status === 'loading' && quests.length === 0) {
    return <LoadingScreen message="Loading your quest log..." />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={text.label}>QuestLog</Text>
          <Text style={text.h1}>Today</Text>
          <Text style={text.faint}>{today}</Text>
        </View>
        <Button
          label="New quest"
          icon="add"
          size="sm"
          onPress={() => router.push('/quests')}
        />
      </View>

      <PlayerPanel stats={stats} />

      {error ? <InlineNote message={error} /> : null}

      <View style={styles.tiles}>
        <StatTile
          icon="flame"
          label="Streak"
          value={stats.streak}
          caption={stats.streak === 1 ? 'day in a row' : 'days in a row'}
          color={palette.orange}
        />
        <StatTile
          icon="checkmark-done"
          label="Cleared"
          value={stats.cleared}
          caption="all time"
          color={palette.green}
        />
        <StatTile
          icon="alert-circle"
          label="Overdue"
          value={stats.overdue}
          caption="needs attention"
          color={stats.overdue > 0 ? palette.red : palette.textFaint}
        />
      </View>

      <Panel tone="soft" style={styles.briefing}>
        <Text style={text.label}>Today&apos;s briefing</Text>
        <Text style={text.body}>
          {briefing(stats.open, stats.dueToday, stats.overdue, stats.streak)}
        </Text>
      </Panel>

      <View style={styles.listBlock}>
        <SectionTitle
          label="Active quests"
          right={
            activeQuests.length > preview.length ? (
              <Button label="See all" variant="ghost" size="sm" onPress={() => router.push('/quests')} />
            ) : undefined
          }
        />

        {preview.length === 0 ? (
          <EmptyState
            icon="trophy-outline"
            title="Quest log is clear"
            message="Add a quest to start earning XP. Small ones count: a D rank is 10 XP."
          />
        ) : (
          <View style={styles.list}>
            {preview.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onToggle={() => void toggleQuest(quest)}
                onDelete={() => void deleteQuest(quest)}
              />
            ))}
          </View>
        )}
      </View>

      <Button
        label="Refresh"
        variant="ghost"
        size="sm"
        icon="refresh"
        onPress={() => void refresh()}
      />
    </Screen>
  );
}

function briefing(open: number, dueToday: number, overdue: number, streak: number): string {
  if (open === 0) {
    return 'Nothing is on the board. Add a quest whenever you are ready.';
  }
  const chunks: string[] = [];
  chunks.push(`${open} open quest${open === 1 ? '' : 's'}`);
  if (dueToday > 0) chunks.push(`${dueToday} due today`);
  if (overdue > 0) chunks.push(`${overdue} overdue`);
  const head = chunks.join(', ') + '.';
  if (streak === 0) {
    return `${head} Clear one quest today to start a streak.`;
  }
  const tail =
    streak >= 7
      ? ` ${streak} days strong, do not break the chain now.`
      : ` Keep the ${streak} day streak alive.`;
  return head + tail;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  briefing: { gap: spacing.xs },
  listBlock: { gap: spacing.md },
  list: { gap: spacing.sm },
});
