import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, InlineNote } from '@/components/ui';
import type { QuestPlan, QuestPlanSuggestion } from '@/lib/api';
import { palette, rankColors, radius, spacing, text } from '@/lib/theme';

type QuestScribeReviewProps = {
  visible: boolean;
  goal: string;
  plan: QuestPlan;
  error: string | null;
  accepting: boolean;
  onClose: () => void;
  onAccept: (suggestions: QuestPlanSuggestion[]) => void;
};

function dueLabel(days: number | null): string {
  if (days === null) return 'No date';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function QuestScribeReview({
  visible,
  goal,
  plan,
  error,
  accepting,
  onClose,
  onAccept,
}: QuestScribeReviewProps) {
  const [selected, setSelected] = useState<boolean[]>([]);

  useEffect(() => {
    if (visible) setSelected(plan.quests.map(() => true));
  }, [plan, visible]);

  const selectedCount = selected.filter(Boolean).length;
  const acceptedSuggestions = plan.quests.filter((_, index) => selected[index]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.heading}>
            <View style={styles.headingIcon}>
              <Ionicons name="sparkles" size={18} color={palette.gold} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={text.h2}>Review your questline</Text>
              <Text style={text.muted}>Quest Scribe made {plan.quests.length} suggestions. You decide what gets saved.</Text>
            </View>
          </View>

          <View style={styles.goalBox}>
            <Text style={text.label}>Your goal</Text>
            <Text style={[text.body, styles.goal]}>{goal}</Text>
            <Text style={text.faint}>Horizon: {plan.horizonDays} days</Text>
          </View>

          {error ? <InlineNote message={error} /> : null}

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {plan.quests.map((quest, index) => {
              const isSelected = selected[index] ?? false;
              const tone = rankColors[quest.difficulty];
              return (
                <Pressable
                  key={`${quest.title}-${index}`}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`Accept suggested quest ${quest.title}`}
                  accessibilityState={{ checked: isSelected, disabled: accepting }}
                  disabled={accepting}
                  onPress={() => {
                    setSelected((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)));
                  }}
                  style={({ pressed }) => [
                    styles.suggestion,
                    isSelected && styles.suggestionSelected,
                    pressed && !accepting && styles.pressed,
                  ]}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected ? <Ionicons name="checkmark" size={15} color={palette.onGold} /> : null}
                  </View>
                  <View style={styles.suggestionBody}>
                    <Text style={styles.suggestionTitle}>{quest.title}</Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.metaChip, { borderColor: tone.fg, backgroundColor: tone.bg }]}>
                        <Text style={[styles.metaText, { color: tone.fg }]}>{quest.difficulty}</Text>
                      </View>
                      <View style={styles.metaChip}>
                        <Text style={styles.metaText}>{dueLabel(quest.due_in_days)}</Text>
                      </View>
                    </View>
                    {quest.notes ? <Text style={[text.faint, styles.notes]}>{quest.notes}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[text.faint, styles.disclaimer]}>
            Nothing is saved until you accept the selected quests.
          </Text>

          <View style={styles.actions}>
            <Button label="Cancel" variant="secondary" onPress={onClose} disabled={accepting} style={styles.action} />
            <Button
              label={`Accept ${selectedCount}`}
              icon="checkmark-circle-outline"
              onPress={() => onAccept(acceptedSuggestions)}
              loading={accepting}
              disabled={selectedCount === 0}
              style={styles.action}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  headingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.goldWash,
    borderWidth: 1,
    borderColor: palette.goldDeep,
  },
  headingCopy: { flex: 1, gap: spacing.xs },
  goalBox: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.borderSoft,
  },
  goal: { fontWeight: '600' },
  list: { maxHeight: 380 },
  listContent: { gap: spacing.sm },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.bgElevated,
  },
  suggestionSelected: { borderColor: palette.goldDeep, backgroundColor: palette.goldWash },
  pressed: { opacity: 0.72 },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: palette.border,
    backgroundColor: palette.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxSelected: { backgroundColor: palette.gold, borderColor: palette.gold },
  suggestionBody: { flex: 1, gap: spacing.sm },
  suggestionTitle: { color: palette.text, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.panel,
  },
  metaText: { color: palette.textMuted, fontSize: 11, fontWeight: '700' },
  notes: { lineHeight: 17 },
  disclaimer: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
