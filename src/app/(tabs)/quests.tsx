import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QuestCard } from '@/components/game-ui';
import { QuestScribeReview } from '@/components/quest-scribe';
import {
  Button,
  Chip,
  ConfirmDialog,
  EmptyState,
  InlineNote,
  LoadingScreen,
  Panel,
  Screen,
  SectionTitle,
  TextField,
} from '@/components/ui';
import { generateQuestPlan, type QuestPlan, type QuestPlanSuggestion } from '@/lib/api';
import { RANKS, RANK_HINT, XP_BY_RANK, dayKey, sortQuestList, type Quest, type Rank } from '@/lib/game';
import { palette, rankColors, radius, spacing, text } from '@/lib/theme';
import { useQuests } from '@/providers/quests';

type Filter = 'active' | 'done' | 'all';

const DUE_PRESETS: Array<{ label: string; days: number | null }> = [
  { label: 'No date', days: null },
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'In a week', days: 7 },
];

function dueDateFromDays(days: number | null): string | null {
  if (days === null) return null;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

export default function QuestsScreen() {
  const { quests, stats, status, error, addQuest, addQuestLine, toggleQuest, deleteQuest } = useQuests();

  const [formOpen, setFormOpen] = useState(false);
  const [scribeOpen, setScribeOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [scribeGoal, setScribeGoal] = useState('');
  const [scribeHorizon, setScribeHorizon] = useState(21);
  const [rank, setRank] = useState<Rank>('C');
  const [dueDays, setDueDays] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [scribeError, setScribeError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [scribePending, setScribePending] = useState(false);
  const [acceptingScribe, setAcceptingScribe] = useState(false);
  const [reviewPlan, setReviewPlan] = useState<QuestPlan | null>(null);
  const [toDelete, setToDelete] = useState<Quest | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const sorted = sortQuestList(quests);
    if (filter === 'active') return sorted.filter((quest) => quest.status === 'open');
    if (filter === 'done') return sorted.filter((quest) => quest.status === 'done');
    return sorted;
  }, [quests, filter]);

  const counts = useMemo(
    () => ({
      active: quests.filter((quest) => quest.status === 'open').length,
      done: quests.filter((quest) => quest.status === 'done').length,
      all: quests.length,
    }),
    [quests],
  );

  const generateScribePlan = async () => {
    setScribeError(null);
    const cleanGoal = scribeGoal.trim();
    if (cleanGoal.length < 4) {
      setScribeError('Describe your goal in a few words.');
      return;
    }
    if (cleanGoal.length > 300) {
      setScribeError('Keep the goal under 300 characters.');
      return;
    }

    setScribePending(true);
    try {
      const plan = await generateQuestPlan(cleanGoal, scribeHorizon);
      setReviewError(null);
      setReviewPlan(plan);
      setScribeOpen(false);
    } catch (scribeFailure) {
      setScribeError(scribeFailure instanceof Error ? scribeFailure.message : 'Could not generate a questline.');
    } finally {
      setScribePending(false);
    }
  };

  const acceptScribePlan = async (suggestions: QuestPlanSuggestion[]) => {
    if (!reviewPlan) return;
    setReviewError(null);
    setAcceptingScribe(true);

    const result = await addQuestLine(
      suggestions.map((suggestion) => ({
        title: suggestion.title,
        notes: suggestion.notes,
        difficulty: suggestion.difficulty,
        due_date: dueDateFromDays(suggestion.due_in_days),
        ai_generated: true,
        ai_plan_id: reviewPlan.planId,
      })),
    );

    setAcceptingScribe(false);
    if (result.error) {
      setReviewError(result.error);
      return;
    }

    setReviewPlan(null);
    setReviewError(null);
    setScribeGoal('');
    setFilter('active');
  };

  const submit = async () => {
    setFormError(null);
    const clean = title.trim();
    if (!clean) {
      setFormError('Give the quest a title.');
      return;
    }
    if (clean.length > 140) {
      setFormError('Keep the title under 140 characters.');
      return;
    }

    setPending(true);
    const result = await addQuest({ title: clean, difficulty: rank, due_date: dueDateFromDays(dueDays) });
    setPending(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    setTitle('');
    setRank('C');
    setDueDays(null);
    setFormOpen(false);
    setFilter('active');
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    const result = await deleteQuest(target);
    setDeleteError(result.error);
  };

  if (status === 'loading' && quests.length === 0) {
    return <LoadingScreen message="Loading your quest log..." />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={text.label}>Quest board</Text>
          <Text style={text.h1}>{counts.active} active</Text>
          <Text style={text.faint}>{counts.done} cleared all time</Text>
        </View>
        <View style={styles.headerActions}>
          <Button
            label={scribeOpen ? 'Close' : 'Quest Scribe'}
            icon={scribeOpen ? 'close' : 'sparkles-outline'}
            variant={scribeOpen ? 'secondary' : 'ghost'}
            size="sm"
            onPress={() => {
              setScribeOpen((open) => !open);
              setFormOpen(false);
              setScribeError(null);
            }}
          />
          <Button
            label={formOpen ? 'Close' : 'New quest'}
            icon={formOpen ? 'close' : 'add'}
            variant={formOpen ? 'secondary' : 'primary'}
            size="sm"
            onPress={() => {
              setFormOpen((open) => !open);
              setScribeOpen(false);
              setFormError(null);
            }}
          />
        </View>
      </View>

      {error ? <InlineNote message={error} /> : null}
      {deleteError ? <InlineNote message={deleteError} /> : null}

      {scribeOpen ? (
        <Panel tone="gold" style={styles.form}>
          <View style={styles.scribeHeading}>
            <Ionicons name="sparkles" size={18} color={palette.gold} />
            <Text style={text.label}>Quest Scribe</Text>
          </View>
          <Text style={text.muted}>
            Give Quest Scribe one goal. It will suggest small, actionable quests for you to review.
          </Text>
          <TextField
            label="What are you working toward?"
            value={scribeGoal}
            onChangeText={setScribeGoal}
            placeholder="Prepare for my capstone defense"
            maxLength={300}
            multiline
            numberOfLines={3}
            hint="Nothing is saved until you approve the suggestions."
          />
          <View style={styles.fieldBlock}>
            <Text style={text.label}>Time horizon</Text>
            <View style={styles.chipRow}>
              {[7, 21, 30].map((days) => (
                <Chip
                  key={days}
                  label={`${days} days`}
                  active={scribeHorizon === days}
                  onPress={() => setScribeHorizon(days)}
                />
              ))}
            </View>
          </View>
          {scribeError ? <InlineNote message={scribeError} /> : null}
          <Button
            label="Generate questline"
            icon="sparkles-outline"
            onPress={() => void generateScribePlan()}
            loading={scribePending}
            fullWidth
          />
        </Panel>
      ) : null}

      {formOpen ? (
        <Panel tone="soft" style={styles.form}>
          <Text style={text.label}>Accept a new quest</Text>
          <TextField
            label="What needs doing?"
            value={title}
            onChangeText={setTitle}
            placeholder="Finish the QuestLog README"
            maxLength={140}
            returnKeyType="done"
            onSubmitEditing={submit}
          />

          <View style={styles.fieldBlock}>
            <Text style={text.label}>Difficulty</Text>
            <View style={styles.rankRow}>
              {RANKS.map((option) => {
                const tone = rankColors[option];
                const selected = option === rank;
                return (
                  <View key={option} style={styles.rankOption}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Rank ${option}, ${XP_BY_RANK[option]} XP`}
                      accessibilityState={{ selected }}
                      onPress={() => setRank(option)}
                      style={({ pressed }) => [
                        styles.rankButton,
                        { borderColor: tone.fg, backgroundColor: selected ? tone.fg : 'transparent' },
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text style={[styles.rankButtonText, { color: selected ? palette.onGold : tone.fg }]}>
                        {option}
                      </Text>
                    </Pressable>
                    <Text style={[text.faint, styles.rankXp]}>{XP_BY_RANK[option]} XP</Text>
                  </View>
                );
              })}
            </View>
            <Text style={text.faint}>
              {rank} - {RANK_HINT[rank]}
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={text.label}>Due date</Text>
            <View style={styles.chipRow}>
              {DUE_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  active={dueDays === preset.days}
                  onPress={() => setDueDays(preset.days)}
                />
              ))}
            </View>
          </View>

          {formError ? <InlineNote message={formError} /> : null}

          <View style={styles.formActions}>
            <Button label="Cancel" variant="secondary" onPress={() => setFormOpen(false)} style={styles.formAction} />
            <Button
              label="Accept quest"
              icon="add-circle-outline"
              onPress={submit}
              loading={pending}
              style={styles.formAction}
            />
          </View>
        </Panel>
      ) : null}

      <View style={styles.filterRow}>
        <Chip label={`Active ${counts.active}`} active={filter === 'active'} onPress={() => setFilter('active')} />
        <Chip label={`Cleared ${counts.done}`} active={filter === 'done'} onPress={() => setFilter('done')} />
        <Chip label={`All ${counts.all}`} active={filter === 'all'} onPress={() => setFilter('all')} />
      </View>

      <View style={styles.listBlock}>
        <SectionTitle
          label={filter === 'done' ? 'Cleared quests' : filter === 'all' ? 'Every quest' : 'On the board'}
          right={<Text style={text.faint}>{stats.totalXp} XP earned</Text>}
        />

        {visible.length === 0 ? (
          <EmptyState
            icon={filter === 'done' ? 'hourglass-outline' : 'trophy-outline'}
            title={
              filter === 'done'
                ? 'Nothing cleared yet'
                : filter === 'all'
                  ? 'Empty quest log'
                  : 'No active quests'
            }
            message={
              filter === 'done'
                ? 'Clear a quest and it will show up here with the XP it earned.'
                : 'Add your first quest with the New quest button above.'
            }
          />
        ) : (
          <View style={styles.list}>
            {visible.map((quest) => (
              <QuestCard
                key={quest.id}
                quest={quest}
                onToggle={() => void toggleQuest(quest)}
                onDelete={() => {
                  setDeleteError(null);
                  setToDelete(quest);
                }}
              />
            ))}
          </View>
        )}
      </View>

      {reviewPlan ? (
        <QuestScribeReview
          visible
          goal={scribeGoal}
          plan={reviewPlan}
          error={reviewError}
          accepting={acceptingScribe}
          onClose={() => {
            if (acceptingScribe) return;
            setReviewPlan(null);
            setReviewError(null);
          }}
          onAccept={(suggestions) => void acceptScribePlan(suggestions)}
        />
      ) : null}

      <ConfirmDialog
        visible={toDelete !== null}
        title="Delete this quest?"
        message={
          toDelete?.status === 'done'
            ? `"${toDelete?.title ?? ''}" is already cleared. Deleting it also removes the XP it earned.`
            : `"${toDelete?.title ?? ''}" will be removed from your log for good.`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerActions: { alignItems: 'flex-end', gap: spacing.xs },
  form: { gap: spacing.lg },
  scribeHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldBlock: { gap: spacing.sm },
  rankRow: { flexDirection: 'row', gap: spacing.md },
  rankOption: { alignItems: 'center', gap: spacing.xs },
  rankButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankButtonText: { fontSize: 17, fontWeight: '800' },
  rankXp: { fontSize: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  formActions: { flexDirection: 'row', gap: spacing.md },
  formAction: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  listBlock: { gap: spacing.md },
  list: { gap: spacing.sm },
});
