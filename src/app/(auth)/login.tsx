import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Divider, InlineNote, Screen, TextField } from '@/components/ui';
import {
  configSnapshot,
  explainProbe,
  probeCredentials,
  type ProbeResult,
} from '@/lib/diagnostics';
import { mono, palette, radius, spacing, text } from '@/lib/theme';
import { useSession } from '@/providers/session';

export default function LoginScreen() {
  const { signIn, signInWithDemo, demoAvailable } = useSession();
  const snapshot = configSnapshot();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'signin' | 'demo' | null>(null);

  const [demoEmail, setDemoEmail] = useState(snapshot.demoEmail);
  const [demoPassword, setDemoPassword] = useState(snapshot.demoPassword);

  const showDemoButton = demoAvailable || (!!__DEV__ && demoEmail.length > 0 && demoPassword.length > 0);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setBusy('signin');
    const result = await signIn(email, password);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/home');
  };

  const submitDemo = async () => {
    setError(null);
    setBusy('demo');
    const result = await signInWithDemo(demoEmail, demoPassword);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.replace('/home');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen padded bottomInset>
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Ionicons name="shield-checkmark" size={30} color={palette.gold} />
          </View>
          <Text style={styles.title}>QuestLog</Text>
          <Text style={[text.muted, styles.subtitle]}>
            Real life tasks are quests. Clear them, earn XP, keep the streak alive.
          </Text>
        </View>

        {error ? <InlineNote message={error} /> : null}

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button
            label="Sign in"
            icon="log-in-outline"
            onPress={submit}
            loading={busy === 'signin'}
            disabled={busy !== null}
            fullWidth
          />
        </View>

        {showDemoButton ? (
          <>
            <Divider label="or" />
            <Button
              label="Try the demo account"
              icon="play-circle-outline"
              variant="secondary"
              onPress={submitDemo}
              loading={busy === 'demo'}
              disabled={busy !== null}
              fullWidth
            />
            <Text style={[text.faint, styles.demoHint]}>
              Signs you into a shared demo save file. No signup needed.
            </Text>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={text.muted}>New here?</Text>
          <Button
            label="Create an account"
            variant="ghost"
            size="sm"
            icon="arrow-forward"
            onPress={() => router.push('/register')}
          />
        </View>

        {__DEV__ ? (
          <SetupCheck
            email={demoEmail}
            password={demoPassword}
            onEmailChange={setDemoEmail}
            onPasswordChange={setDemoPassword}
          />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

function SetupCheck({
  email,
  password,
  onEmailChange,
  onPasswordChange,
}: {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}) {
  const { session, lastAuthError, clearSavedSession } = useSession();
  const snapshot = configSnapshot();
  const [open, setOpen] = useState(Platform.OS === 'web');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);

  const runProbe = async () => {
    setBusy(true);
    setResult(null);
    const next = await probeCredentials(email, password);
    setResult(next);
    setBusy(false);
  };

  const doReset = async () => {
    setResetting(true);
    await clearSavedSession();
    setResult(null);
    setResetting(false);
  };

  return (
    <View style={styles.devBox}>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.devHeader}>
        <Ionicons name="construct-outline" size={16} color={palette.blue} />
        <Text style={styles.devTitle}>Setup check (dev only)</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={palette.textFaint}
        />
      </Pressable>

      {open ? (
        <View style={styles.devBody}>
          <Readout label="Project" value={snapshot.host} />
          <Readout label="Key" value={`${snapshot.keyLabel} (${snapshot.keyLength} chars)`} />
          <Readout label="Configured" value={snapshot.configured ? 'yes' : 'NO - fix .env'} />
          <Readout label="Demo password" value={snapshot.demoPasswordLength === 0 ? '(empty)' : `${snapshot.demoPasswordLength} chars from bundled env`} />
          <Readout
            label="Saved session"
            value={session?.user?.id ? `${session.user.id.slice(0, 8)}... (${session.user.email ?? 'no email'})` : 'none'}
          />

          <Text style={[text.faint, styles.devHint]}>
            Edit these and press Try the demo account above. This bypasses the bundled env values without a rebuild.
          </Text>

          <TextField
            label="Demo email (runtime)"
            value={email}
            onChangeText={onEmailChange}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="demo@questlog.app"
          />
          <TextField
            label="Demo password (runtime)"
            value={password}
            onChangeText={onPasswordChange}
            secureTextEntry={!reveal}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Password from Supabase Auth"
          />
          <Pressable onPress={() => setReveal((value) => !value)} style={styles.revealRow}>
            <Ionicons name={reveal ? 'eye-off-outline' : 'eye-outline'} size={15} color={palette.textMuted} />
            <Text style={[text.faint, styles.revealText]}>{reveal ? 'Hide password' : 'Show password'}</Text>
          </Pressable>

          <View style={styles.devActions}>
            <Button label="Test credentials" icon="flash-outline" variant="secondary" size="sm" onPress={runProbe} loading={busy} />
            <Button label="Clear saved session" icon="trash-outline" variant="ghost" size="sm" onPress={doReset} loading={resetting} />
          </View>

          {result ? (
            <InlineNote
              message={explainProbe(result)}
              tone={result.ok ? 'success' : 'error'}
            />
          ) : null}

          {result ? (
            <Text style={styles.raw}>{`HTTP ${result.status ?? 'n/a'}  ${result.code ?? ''}\n${result.message}`}</Text>
          ) : null}

          {lastAuthError ? <Text style={styles.raw}>{`Last sign-in error:\n${lastAuthError}`}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readout}>
      <Text style={styles.readoutLabel}>{label}</Text>
      <Text style={styles.readoutValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  hero: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  mark: {
    width: 68,
    height: 68,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.goldDeep,
    backgroundColor: palette.goldWash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 30, fontWeight: '800', color: palette.text, letterSpacing: 0.5 },
  subtitle: { textAlign: 'center', maxWidth: 320 },
  form: { gap: spacing.lg },
  demoHint: { textAlign: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  devBox: {
    marginTop: spacing.xxl,
    borderWidth: 1,
    borderColor: palette.blue,
    borderRadius: radius.md,
    backgroundColor: palette.blueWash,
    overflow: 'hidden',
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  devTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: palette.blue },
  devBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  devHint: { marginTop: spacing.xs, marginBottom: spacing.xs },
  readout: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  readoutLabel: { fontSize: 11, color: palette.textFaint, fontWeight: '700', letterSpacing: 0.6 },
  readoutValue: { flex: 1, textAlign: 'right', fontSize: 11, color: palette.text, fontFamily: mono },
  revealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  revealText: { textDecorationLine: 'underline' },
  devActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  raw: {
    fontFamily: mono,
    fontSize: 11,
    lineHeight: 16,
    color: palette.textMuted,
    backgroundColor: palette.bg,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
});
