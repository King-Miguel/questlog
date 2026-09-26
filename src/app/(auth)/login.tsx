import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, Divider, InlineNote, Screen, TextField } from '@/components/ui';
import { palette, radius, spacing, text } from '@/lib/theme';
import { useSession } from '@/providers/session';

export default function LoginScreen() {
  const { signIn, signInWithDemo, demoAvailable } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'signin' | 'demo' | null>(null);

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
    const result = await signInWithDemo();
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

        {demoAvailable ? (
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
      </Screen>
    </KeyboardAvoidingView>
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
});
