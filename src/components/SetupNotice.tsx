import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { palette, radius, spacing, text } from '@/lib/theme';

const STEPS = [
  'Make a project at supabase.com, then open the SQL Editor and run supabase/schema.sql.',
  'In the project root, copy .env.example to .env and paste your Project URL and anon or publishable key.',
  'Restart the dev server with: npx expo start --clear',
];

export function SetupNotice() {
  return (
    <Screen scroll padded bottomInset>
      <View style={styles.header}>
        <View style={styles.mark}>
          <Ionicons name="shield-checkmark" size={26} color={palette.gold} />
        </View>
        <Text style={text.h1}>QuestLog</Text>
        <Text style={[text.muted, styles.center]}>
          The app shell is running. Connect Supabase to switch on accounts, quests, XP and streaks.
        </Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.stepIndex}>
              <Text style={styles.stepIndexText}>{index + 1}</Text>
            </View>
            <Text style={[text.body, styles.stepText]}>{step}</Text>
          </View>
        ))}
      </View>

      <View style={styles.hint}>
        <Ionicons name="information-circle-outline" size={16} color={palette.blue} />
        <Text style={[text.faint, styles.hintText]}>
          Env values are read at build time, so the dev server has to restart after you edit .env.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  mark: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.goldDeep,
    backgroundColor: palette.goldWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  steps: { gap: spacing.md },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
  },
  stepIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: palette.goldWash,
    borderWidth: 1,
    borderColor: palette.goldDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndexText: { color: palette.gold, fontSize: 12, fontWeight: '800' },
  stepText: { flex: 1 },
  hint: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    padding: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.borderSoft,
    borderRadius: radius.md,
  },
  hintText: { flex: 1 },
});
