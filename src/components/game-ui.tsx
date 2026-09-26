import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Panel, ProgressBar } from '@/components/ui';
import {
  XP_BY_RANK,
  formatDueLabel,
  initialsFromName,
  type GameStats,
  type Quest,
  type Rank,
} from '@/lib/game';
import { palette, radius, rankColors, spacing, text } from '@/lib/theme';

export function RankChip({ rank, size = 'md' }: { rank: Rank; size?: 'sm' | 'md' | 'lg' }) {
  const tone = rankColors[rank];
  const box = size === 'lg' ? 34 : size === 'sm' ? 18 : 22;
  return (
    <View
      style={[
        styles.rankBox,
        { width: box, height: box, borderRadius: size === 'sm' ? 5 : 7, backgroundColor: tone.bg, borderColor: tone.fg },
      ]}
    >
      <Text
        style={{
          color: tone.fg,
          fontWeight: '800',
          fontSize: size === 'lg' ? 17 : size === 'sm' ? 10 : 12,
        }}
      >
        {rank}
      </Text>
    </View>
  );
}

export function LevelBadge({ level, size = 58 }: { level: number; size?: number }) {
  return (
    <View style={[styles.levelBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.levelBadgeLabel}>LV</Text>
      <Text style={[styles.levelBadgeValue, { fontSize: size * 0.36 }]}>{level}</Text>
    </View>
  );
}

export function PlayerPanel({ stats }: { stats: GameStats }) {
  return (
    <Panel tone="soft" style={styles.playerPanel}>
      <View style={styles.playerTop}>
        <LevelBadge level={stats.level} />
        <View style={styles.playerIdentity}>
          <Text style={text.label}>{stats.title}</Text>
          <Text style={text.h1}>{stats.level}</Text>
          <Text style={text.faint}>Total {stats.totalXp} XP earned</Text>
        </View>
        <View style={styles.streakBox}>
          <Ionicons name="flame" size={20} color={stats.streak > 0 ? palette.orange : palette.textFaint} />
          <Text style={[styles.streakValue, stats.streak === 0 && { color: palette.textFaint }]}>
            {stats.streak}
          </Text>
          <Text style={text.faint}>day streak</Text>
        </View>
      </View>

      <View style={styles.xpBlock}>
        <View style={styles.xpRow}>
          <Text style={text.faint}>
            {stats.xpIntoLevel} / {stats.xpForThisLevel} XP
          </Text>
          <Text style={text.faint}>{stats.xpToNextLevel} XP to level {stats.level + 1}</Text>
        </View>
        <ProgressBar percent={stats.percent} height={12} />
      </View>
    </Panel>
  );
}

export function StatTile({
  icon,
  label,
  value,
  caption,
  color = palette.gold,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  caption?: string;
  color?: string;
}) {
  return (
    <View style={styles.tile}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
      <Text style={text.label}>{label}</Text>
      {caption ? <Text style={[text.faint, styles.tileCaption]}>{caption}</Text> : null}
    </View>
  );
}

export function QuestCard({
  quest,
  onToggle,
  onDelete,
  pending = false,
}: {
  quest: Quest;
  onToggle: () => void;
  onDelete: () => void;
  pending?: boolean;
}) {
  const done = quest.status === 'done';
  const dueLabel = formatDueLabel(quest.due_date);
  const isOverdue = !done && dueLabel?.startsWith('Overdue');
  const tone = rankColors[quest.difficulty];

  return (
    <View style={[styles.questCard, done && styles.questCardDone, pending && { opacity: 0.6 }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Mark ${quest.title} as ${done ? 'not cleared' : 'cleared'}`}
        onPress={onToggle}
        hitSlop={6}
        style={({ pressed }) => [
          styles.checkbox,
          done && { backgroundColor: palette.green, borderColor: palette.green },
          pressed && { opacity: 0.7 },
        ]}
      >
        {done ? <Ionicons name="checkmark" size={15} color={palette.onGold} /> : null}
      </Pressable>

      <Pressable style={styles.questBody} onPress={onToggle} accessibilityRole="button">
        <Text style={[styles.questTitle, done && styles.questTitleDone]} numberOfLines={2}>
          {quest.title}
        </Text>
        <View style={styles.questMeta}>
          <View style={[styles.metaChip, { backgroundColor: tone.bg, borderColor: tone.fg }]}>
            <Text style={[styles.metaChipText, { color: tone.fg }]}>
              {quest.difficulty} - {XP_BY_RANK[quest.difficulty]} XP
            </Text>
          </View>
          {dueLabel ? (
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isOverdue ? palette.redWash : palette.bgElevated,
                  borderColor: isOverdue ? palette.red : palette.border,
                },
              ]}
            >
              <Text style={[styles.metaChipText, { color: isOverdue ? palette.red : palette.textMuted }]}>
                {dueLabel}
              </Text>
            </View>
          ) : null}
          {done && quest.xp_awarded > 0 ? (
            <Text style={[styles.metaChipText, { color: palette.green }]}>+{quest.xp_awarded} XP</Text>
          ) : null}
        </View>
        {quest.notes ? (
          <Text style={[text.faint, styles.questNotes]} numberOfLines={2}>
            {quest.notes}
          </Text>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${quest.title}`}
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="trash-outline" size={17} color={palette.textFaint} />
      </Pressable>
    </View>
  );
}

export function XpNotice({ notice }: { notice: string | null }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: notice ? 1 : 0,
      duration: notice ? 180 : 320,
      useNativeDriver: true,
    }).start();
  }, [notice, opacity]);

  return (
    <Animated.View pointerEvents="none" style={[styles.notice, { opacity }]}>
      <Ionicons name="sparkles" size={15} color={palette.gold} />
      <Text style={styles.noticeText}>{notice ?? ''}</Text>
    </Animated.View>
  );
}

export function Avatar({
  name,
  size = 68,
  uri,
}: {
  name: string | null | undefined;
  size?: number;
  uri?: string | null;
}) {
  const initials = initialsFromName(name, 'Q');
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        uri ? { borderColor: palette.gold } : null,
      ]}
    >
      <Text style={{ color: palette.gold, fontWeight: '800', fontSize: size * 0.34 }}>{initials}</Text>
    </View>
  );
}

export function RankRow({
  rank,
  cleared,
  open,
  xp,
  total,
  style,
}: {
  rank: Rank;
  cleared: number;
  open: number;
  xp: number;
  total: number;
  style?: StyleProp<ViewStyle>;
}) {
  const tone = rankColors[rank];
  const percent = total === 0 ? 0 : cleared / total;
  return (
    <View style={[styles.rankRow, style]}>
      <RankChip rank={rank} />
      <View style={styles.rankRowBody}>
        <View style={styles.rankRowHead}>
          <Text style={text.muted}>
            {cleared} cleared{open > 0 ? ` - ${open} open` : ''}
          </Text>
          <Text style={[text.faint, { color: tone.fg }]}>{xp} XP</Text>
        </View>
        <ProgressBar percent={percent} color={tone.fg} height={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rankBox: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  levelBadge: {
    borderWidth: 2,
    borderColor: palette.gold,
    backgroundColor: palette.goldWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadgeLabel: { color: palette.gold, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  levelBadgeValue: { color: palette.gold, fontWeight: '800', lineHeight: 28 },
  playerPanel: { gap: spacing.lg },
  playerTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  playerIdentity: { flex: 1, gap: 2 },
  streakBox: { alignItems: 'center', gap: 2, minWidth: 62 },
  streakValue: { color: palette.orange, fontSize: 22, fontWeight: '800' },
  xpBlock: { gap: spacing.sm },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  tile: {
    flex: 1,
    minWidth: 96,
    gap: 2,
    padding: spacing.md,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
  },
  tileValue: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileCaption: { marginTop: 2 },
  questCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
  },
  questCardDone: { backgroundColor: palette.bgElevated, borderColor: palette.borderSoft },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  questBody: { flex: 1, gap: spacing.sm },
  questTitle: { color: palette.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  questTitleDone: { color: palette.textMuted, textDecorationLine: 'line-through' },
  questMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  questNotes: { lineHeight: 17 },
  metaChip: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1 },
  metaChipText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  deleteButton: { padding: 4, marginTop: 1 },
  notice: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: palette.panelSoft,
    borderWidth: 1,
    borderColor: palette.goldDeep,
  },
  noticeText: { color: palette.gold, fontWeight: '700', fontSize: 13 },
  avatar: {
    borderWidth: 2,
    borderColor: palette.border,
    backgroundColor: palette.panelSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rankRowBody: { flex: 1, gap: 6 },
  rankRowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
});
