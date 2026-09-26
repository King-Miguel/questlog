import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, radius, spacing, text } from '@/lib/theme';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  bottomInset?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, padded = true, bottomInset = false, style }: ScreenProps) {
  const edges = bottomInset ? (['top', 'left', 'right', 'bottom'] as const) : (['top', 'left', 'right'] as const);
  const content = padded ? [styles.screenPadding, style] : [style];

  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screen, content]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Panel({
  children,
  style,
  tone = 'default',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'soft' | 'gold';
}) {
  return (
    <View
      style={[
        styles.panel,
        tone === 'soft' && { backgroundColor: palette.panelSoft },
        tone === 'gold' && { borderColor: palette.goldDeep, backgroundColor: palette.goldWash },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ label, right }: { label: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={text.label}>{label}</Text>
      {right}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const tone = BUTTON_TONES[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        { backgroundColor: tone.bg, borderColor: tone.border },
        fullWidth && styles.buttonFull,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tone.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 17} color={tone.fg} /> : null}
          <Text style={[styles.buttonLabel, size === 'sm' && styles.buttonLabelSm, { color: tone.fg }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const BUTTON_TONES = {
  primary: { bg: palette.gold, border: palette.gold, fg: palette.onGold },
  secondary: { bg: palette.panelSoft, border: palette.border, fg: palette.text },
  ghost: { bg: 'transparent', border: 'transparent', fg: palette.textMuted },
  danger: { bg: palette.redWash, border: palette.red, fg: palette.red },
} as const;

export function TextField({
  label,
  hint,
  error,
  style,
  ...inputProps
}: TextInputProps & { label?: string; hint?: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={[text.label, styles.fieldLabel]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={palette.textFaint}
        {...inputProps}
        style={[styles.input, inputProps.multiline && styles.inputMultiline, error ? styles.inputError : null, style]}
      />
      {error ? (
        <Text style={styles.fieldError}>{error}</Text>
      ) : hint ? (
        <Text style={[text.faint, styles.fieldHint]}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  active = false,
  onPress,
  color,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const accent = color ?? palette.gold;
  const content = (
    <Text style={[styles.chipLabel, { color: active ? palette.onGold : palette.textMuted }]}>{label}</Text>
  );

  if (!onPress) {
    return (
      <View style={[styles.chip, { borderColor: palette.border }, style]}>
        <Text style={[styles.chipLabel, { color: accent }]}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: active ? accent : palette.border, backgroundColor: active ? accent : 'transparent' },
        pressed && styles.pressed,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function ProgressBar({
  percent,
  color = palette.gold,
  height = 10,
}: {
  percent: number;
  color?: string;
  height?: number;
}) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(percent) ? percent : 0));
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height / 2 }]}>
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  color = palette.textMuted,
  size = 18,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
}) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={26} color={palette.textFaint} />
      <Text style={[text.h3, styles.emptyTitle]}>{title}</Text>
      <Text style={[text.muted, styles.emptyMessage]}>{message}</Text>
    </View>
  );
}

export function InlineNote({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'info' | 'success';
}) {
  const tones = {
    error: { bg: palette.redWash, border: palette.red, fg: palette.red, icon: 'alert-circle' as const },
    info: { bg: palette.blueWash, border: palette.blue, fg: palette.blue, icon: 'information-circle' as const },
    success: { bg: palette.greenWash, border: palette.green, fg: palette.green, icon: 'checkmark-circle' as const },
  }[tone];

  return (
    <View style={[styles.note, { backgroundColor: tones.bg, borderColor: tones.border }]}>
      <Ionicons name={tones.icon} size={16} color={tones.fg} />
      <Text style={[styles.noteText, { color: tones.fg }]}>{message}</Text>
    </View>
  );
}

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={palette.gold} size="large" />
      <Text style={[text.muted, styles.loadingText]}>{message}</Text>
    </View>
  );
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={text.h2}>{title}</Text>
          <Text style={[text.muted, styles.modalMessage]}>{message}</Text>
          <View style={styles.modalActions}>
            <Button label={cancelLabel} variant="secondary" onPress={onCancel} style={styles.modalButton} />
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Divider({ label }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      {label ? <Text style={[text.faint, styles.dividerLabel]}>{label}</Text> : null}
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  screenPadding: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  panel: {
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  buttonSm: { paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  buttonFull: { width: '100%' },
  buttonLabel: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  buttonLabelSm: { fontSize: 13 },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  field: { gap: spacing.xs },
  fieldLabel: { marginBottom: 2 },
  input: {
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 15,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: palette.red },
  fieldHint: { marginTop: 2 },
  fieldError: { color: palette.red, fontSize: 12, marginTop: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  progressTrack: {
    width: '100%',
    backgroundColor: palette.bgElevated,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    overflow: 'hidden',
  },
  iconButton: { padding: spacing.xs },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    backgroundColor: palette.bgElevated,
  },
  emptyTitle: { textAlign: 'center' },
  emptyMessage: { textAlign: 'center' },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: palette.bg },
  loadingText: { textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 12, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.panel,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  modalMessage: { marginTop: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  modalButton: { flex: 1 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.borderSoft },
  dividerLabel: { letterSpacing: 1 },
});
