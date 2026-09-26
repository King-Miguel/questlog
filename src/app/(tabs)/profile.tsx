import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, LevelBadge } from '@/components/game-ui';
import { Button, ConfirmDialog, InlineNote, Panel, Screen, SectionTitle, TextField } from '@/components/ui';
import { palette, spacing, text } from '@/lib/theme';
import { useQuests } from '@/providers/quests';
import { useSession } from '@/providers/session';

export default function ProfileScreen() {
  const { session, profile, saveDisplayName, signOut, profileLoading, profileError } = useSession();
  const { stats } = useQuests();

  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  useEffect(() => {
    setName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  const email = session?.user?.email ?? 'unknown';

  const save = async () => {
    setError(null);
    setMessage(null);
    setSaving(true);
    const result = await saveDisplayName(name);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage('Display name saved.');
    setEditing(false);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={text.label}>Adventurer</Text>
        <Text style={text.h1}>Profile</Text>
      </View>

      <Panel style={styles.card}>
        <View style={styles.identity}>
          <Avatar name={profile?.display_name ?? email} uri={profile?.avatar_url} />
          <View style={styles.identityText}>
            <Text style={text.h2}>{profile?.display_name ?? 'Adventurer'}</Text>
            <Text style={text.muted}>{email}</Text>
            <View style={styles.titleRow}>
              <LevelBadge level={stats.level} size={34} />
              <Text style={text.faint}>
                Level {stats.level} {stats.title}
              </Text>
            </View>
          </View>
        </View>

        {profileError ? <InlineNote message={profileError} /> : null}
        {error ? <InlineNote message={error} /> : null}
        {message ? <InlineNote tone="success" message={message} /> : null}

        {editing ? (
          <View style={styles.form}>
            <TextField
              label="Display name"
              value={name}
              onChangeText={setName}
              placeholder="King Miguel"
              maxLength={60}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={save}
            />
            <View style={styles.actions}>
              <Button
                label="Cancel"
                variant="secondary"
                style={styles.action}
                onPress={() => {
                  setEditing(false);
                  setName(profile?.display_name ?? '');
                  setError(null);
                }}
              />
              <Button label="Save" onPress={save} loading={saving} style={styles.action} />
            </View>
          </View>
        ) : (
          <Button
            label="Edit display name"
            icon="pencil-outline"
            variant="secondary"
            onPress={() => {
              setEditing(true);
              setMessage(null);
            }}
          />
        )}
      </Panel>

      <Panel tone="soft" style={styles.card}>
        <SectionTitle label="This save file" />
        <Row label="Total XP" value={`${stats.totalXp}`} />
        <Row label="Level" value={`${stats.level} - ${stats.title}`} />
        <Row label="Current streak" value={`${stats.streak} days`} />
        <Row label="Best streak" value={`${stats.longestStreak} days`} />
        <Row label="Quests cleared" value={`${stats.cleared}`} />
      </Panel>

      <Panel tone="soft" style={styles.card}>
        <SectionTitle label="Account" />
        <Text style={text.muted}>
          Signed in as {email}. Avatar upload arrives in a later pass, the initials badge stands in for now.
        </Text>
        <Button
          label="Sign out"
          icon="log-out-outline"
          variant="danger"
          onPress={() => setConfirmSignOut(true)}
        />
      </Panel>

      <Panel style={styles.card}>
        <SectionTitle label="About" />
        <View style={styles.aboutRow}>
          <Ionicons name="information-circle-outline" size={16} color={palette.textFaint} />
          <Text style={[text.faint, styles.aboutText]}>
            QuestLog v1.0.0 - a personal habit tracker with a light RPG skin. Built with Expo,
            React Native, Expo Router, TypeScript and Supabase.
          </Text>
        </View>
        {profileLoading ? <Text style={text.faint}>Refreshing profile...</Text> : null}
      </Panel>

      <ConfirmDialog
        visible={confirmSignOut}
        title="Sign out?"
        message="Your quests and XP stay saved to your account. You can sign back in any time."
        confirmLabel="Sign out"
        destructive
        onConfirm={() => {
          setConfirmSignOut(false);
          void signOut();
        }}
        onCancel={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={text.muted}>{label}</Text>
      <Text style={text.body}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  card: { gap: spacing.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  identityText: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  form: { gap: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  aboutRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  aboutText: { flex: 1, lineHeight: 18 },
});
