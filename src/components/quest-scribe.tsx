import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Chip, InlineNote, TextField } from '@/components/ui';
import type { QuestPlan, QuestPlanSuggestion } from '@/lib/api';
import { palette, rankColors, radius, spacing, text } from '@/lib/theme';

const HORIZONS = [7, 21, 30];

type QuestScribeDrawerProps = {
  visible: boolean;
  goal: string;
  horizonDays: number;
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onGoalChange: (goal: string) => void;
  onHorizonChange: (days: number) => void;
  onGenerate: () => void;
};

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

export function QuestScribeDrawer({
  visible,
  goal,
  horizonDays,
  error,
  pending,
  onClose,
  onGoalChange,
  onHorizonChange,
  onGenerate,
}: QuestScribeDrawerProps) {
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(1);
    const animation = Animated.timing(slide, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [slide, visible]);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, 520] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close Quest Scribe"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
          <View style={styles.drawerContent}>
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleGroup}>
                <View style={styles.drawerIcon}>
                  <Ionicons name="sparkles" size={23} color={palette.gold} />
                </View>
                <View style={styles.drawerTitleCopy}>
                  <Text style={styles.aiEyebrow}>AI QUESTLINE PLANNER</Text>
                  <Text style={text.h1}>Quest Scribe</Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close Quest Scribe"
                hitSlop={10}
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={22} color={palette.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.introBlock}>
                <Text style={text.h3}>Turn one vague goal into a clear questline.</Text>
                <Text style={text.muted}>
                  This is a planner, not a chat. Describe what you want to achieve, then choose which quests you want to keep.
                </Text>
              </View>

              <View style={styles.planBadge}>
                <Ionicons name="list-outline" size={17} color={palette.gold} />
                <Text style={styles.planBadgeStrong}>3 to 6 quests</Text>
                <Text style={styles.planBadgeText}>with rank and due date suggestions</Text>
              </View>

              <TextField
                label="What are you working toward?"
                value={goal}
                onChangeText={onGoalChange}
                placeholder="Prepare for my capstone defense"
                maxLength={300}
                multiline
                numberOfLines={4}
                hint="Be specific enough for useful next steps."
              />

              <View style={styles.fieldBlock}>
                <Text style={text.label}>Time horizon</Text>
                <View style={styles.chipRow}>
                  {HORIZONS.map((days) => (
                    <Chip
                      key={days}
                      label={`${days} days`}
                      active={horizonDays === days}
                      onPress={() => onHorizonChange(days)}
                    />
                  ))}
                </View>
              </View>

              {error ? <InlineNote message={error} /> : null}

              <Button
                label="Build my questline"
                icon="sparkles-outline"
                onPress={onGenerate}
                loading={pending}
                fullWidth
              />

              <View style={styles.howItWorks}>
                <Text style={text.label}>How it works</Text>
                <Step number="1" label="Describe" detail="Tell Quest Scribe what you want to achieve." />
                <Step number="2" label="Review" detail="Inspect the suggested quests and uncheck anything you do not want." />
                <Step number="3" label="Accept" detail="Only the quests you approve are added to your board." />
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Step({ number, label, detail }: { number: string; label: string; detail: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepLabel}>{label}</Text>
        <Text style={text.faint}>{detail}</Text>
      </View>
    </View>
  );
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.drawerBackdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close questline review"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.reviewDrawer}>
          <View style={styles.reviewHeader}>
            <View style={styles.headingIcon}>
              <Ionicons name="checkmark-done" size={18} color={palette.gold} />
            </View>
            <View style={styles.headingCopy}>
              <Text style={styles.aiEyebrow}>YOUR DRAFT QUESTLINE</Text>
              <Text style={text.h2}>Review before saving</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close questline review"
              disabled={accepting}
              hitSlop={10}
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && !accepting && styles.pressed]}
            >
              <Ionicons name="close" size={22} color={palette.textMuted} />
            </Pressable>
          </View>

          <View style={styles.goalBox}>
            <Text style={text.label}>Your goal</Text>
            <Text style={[text.body, styles.goal]}>{goal}</Text>
            <Text style={text.faint}>Horizon: {plan.horizonDays} days</Text>
          </View>

          {error ? <InlineNote message={error} /> : null}

          <ScrollView
            style={styles.reviewList}
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
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.78)',
    alignItems: 'flex-end',
  },
  drawer: {
    width: '92%',
    maxWidth: 500,
    height: '100%',
    backgroundColor: palette.panel,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  drawerContent: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.lg,
  },
  drawerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  drawerTitleGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  drawerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.goldWash,
    borderWidth: 1,
    borderColor: palette.goldDeep,
  },
  drawerTitleCopy: { flex: 1, gap: spacing.xs },
  aiEyebrow: { color: palette.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  closeButton: { padding: spacing.xs, borderRadius: radius.sm },
  drawerScroll: { flex: 1 },
  drawerScrollContent: { gap: spacing.lg, paddingBottom: spacing.xl },
  introBlock: { gap: spacing.sm },
  planBadge: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.goldWash,
    borderWidth: 1,
    borderColor: palette.goldDeep,
  },
  planBadgeStrong: { color: palette.gold, fontSize: 13, fontWeight: '800' },
  planBadgeText: { color: palette.textMuted, fontSize: 12, flexShrink: 1 },
  fieldBlock: { gap: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  howItWorks: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.borderSoft,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.gold,
  },
  stepNumberText: { color: palette.onGold, fontSize: 12, fontWeight: '800' },
  stepCopy: { flex: 1, gap: 2 },
  stepLabel: { color: palette.text, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  reviewDrawer: {
    width: '92%',
    maxWidth: 520,
    height: '100%',
    backgroundColor: palette.panel,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
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
  reviewList: { flex: 1, minHeight: 160 },
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
