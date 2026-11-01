import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PlayerPanel, RankRow, StatTile } from '@/components/game-ui';
import { LoadingScreen, Panel, Screen, SectionTitle } from '@/components/ui';
import { fetchAiInsights, type AiInsights } from '@/lib/api';
import { RANKS, RANK_HINT } from '@/lib/game';
import { palette, spacing, text } from '@/lib/theme';
import { useQuests } from '@/providers/quests';
import { useSession } from '@/providers/session';

export default function StatsScreen() {
  const { quests, stats, status } = useQuests();
  const { profile } = useSession();
  const [aiInsights, setAiInsights] = useState<AiInsights | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAiInsights()
      .then((insights) => {
        if (active) setAiInsights(insights);
      })
      .catch(() => {
        // The metric stays hidden until the optional AI migration is installed.
        if (active) setAiInsights(null);
      });
    return () => {
      active = false;
    };
  }, [quests.length]);

  const memberSince = useMemo(() => {
    if (!profile?.created_at) return null;
    return new Date(profile.created_at).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    });
  }, [profile?.created_at]);

  if (status === 'loading' && quests.length === 0) {
    return <LoadingScreen message="Crunching your numbers..." />;
  }

  const totalLogged = quests.length;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={text.label}>Character sheet</Text>
        <Text style={text.h1}>Stats</Text>
      </View>

      <PlayerPanel stats={stats} />

      <View style={styles.tiles}>
        <StatTile
          icon="flame"
          label="Streak"
          value={stats.streak}
          caption="current"
          color={palette.orange}
        />
        <StatTile
          icon="ribbon"
          label="Best streak"
          value={stats.longestStreak}
          caption="personal record"
          color={palette.gold}
        />
        <StatTile
          icon="checkmark-done"
          label="Cleared"
          value={stats.cleared}
          caption="quests done"
          color={palette.green}
        />
        <StatTile
          icon="list"
          label="On board"
          value={stats.open}
          caption={stats.dueToday > 0 ? `${stats.dueToday} due today` : 'open quests'}
          color={palette.blue}
        />
        <StatTile
          icon="pie-chart"
          label="Clear rate"
          value={`${Math.round(stats.completionRate * 100)}%`}
          caption={`${totalLogged} logged`}
          color={palette.purple}
        />
        {aiInsights && aiInsights.plans > 0 ? (
          <StatTile
            icon="sparkles"
            label="AI kept"
            value={`${Math.round(aiInsights.acceptanceRate * 100)}%`}
            caption={`${aiInsights.accepted} of ${aiInsights.suggested} accepted`}
            color={palette.gold}
          />
        ) : null}
        <StatTile
          icon="alert-circle"
          label="Overdue"
          value={stats.overdue}
          caption="past due date"
          color={stats.overdue > 0 ? palette.red : palette.textFaint}
        />
      </View>

      <Panel style={styles.breakdown}>
        <SectionTitle label="XP by difficulty" right={<Text style={text.faint}>{stats.totalXp} XP total</Text>} />
        {RANKS.map((rank) => (
          <RankRow
            key={rank}
            rank={rank}
            cleared={stats.byRank[rank].cleared}
            open={stats.byRank[rank].open}
            xp={stats.byRank[rank].xp}
            total={totalLogged}
            style={styles.rankRow}
          />
        ))}
        <Text style={text.faint}>
          S rank quests are worth 250 XP. One milestone can carry a whole level.
        </Text>
      </Panel>

      <Panel tone="soft" style={styles.breakdown}>
        <SectionTitle label="How ranks work" />
        {RANKS.map((rank) => (
          <View key={rank} style={styles.legendRow}>
            <Text style={[styles.legendRank, { color: palette.text }]}>{rank}</Text>
            <Text style={[text.muted, styles.legendText]}>{RANK_HINT[rank]}</Text>
          </View>
        ))}
      </Panel>

      <Panel tone="soft" style={styles.breakdown}>
        <SectionTitle label="Account" />
        <View style={styles.legendRow}>
          <Text style={[text.muted, styles.legendText]}>Adventurer since</Text>
          <Text style={text.body}>{memberSince ?? 'just now'}</Text>
        </View>
        <View style={styles.legendRow}>
          <Text style={[text.muted, styles.legendText]}>Quests logged</Text>
          <Text style={text.body}>{totalLogged}</Text>
        </View>
        <View style={styles.legendRow}>
          <Text style={[text.muted, styles.legendText]}>Total XP</Text>
          <Text style={text.body}>{stats.totalXp}</Text>
        </View>
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  breakdown: { gap: spacing.md },
  rankRow: { marginBottom: spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  legendRank: { fontWeight: '800', fontSize: 15, width: 20 },
  legendText: { flex: 1 },
});
