import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { Button, InlineNote, Screen, TextField } from '@/components/ui';
import { palette, spacing, text } from '@/lib/theme';
import { useSession } from '@/providers/session';

export default function RegisterScreen() {
  const { signUp } = useSession();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setInfo(null);

    if (!displayName.trim()) {
      setError('Pick a display name for your adventurer.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    const result = await signUp(email, password, displayName);
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setInfo('Account created. Check your inbox and confirm your email, then sign in.');
      setPassword('');
      setConfirm('');
      return;
    }
    router.replace('/home');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded bottomInset>
        <View style={styles.head}>
          <Text style={text.h1}>Create your adventurer</Text>
          <Text style={text.muted}>One account, one quest log. Everything is private to you.</Text>
        </View>

        {error ? <InlineNote message={error} /> : null}
        {info ? <InlineNote tone="success" message={info} /> : null}

        <View style={styles.form}>
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="King Miguel"
            autoCapitalize="words"
            returnKeyType="next"
          />
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
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            hint="Minimum 6 characters."
          />
          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Repeat your password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <Button
            label="Create account"
            icon="person-add-outline"
            onPress={submit}
            loading={busy}
            fullWidth
          />
        </View>

        <View style={styles.footer}>
          <Text style={text.muted}>Already have an account?</Text>
          <Button
            label="Back to sign in"
            variant="ghost"
            size="sm"
            icon="arrow-back"
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.bg },
  head: { gap: spacing.xs, marginTop: spacing.lg },
  form: { gap: spacing.lg },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
