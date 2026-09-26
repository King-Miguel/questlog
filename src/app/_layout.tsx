import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SetupNotice } from '@/components/SetupNotice';
import { LoadingScreen } from '@/components/ui';
import { isSupabaseConfigured } from '@/lib/supabase';
import { palette } from '@/lib/theme';
import { QuestsProvider } from '@/providers/quests';
import { SessionProvider, useSession } from '@/providers/session';

export default function RootLayout() {
  if (!isSupabaseConfigured) {
    return (
      <>
        <StatusBar style="light" />
        <SetupNotice />
      </>
    );
  }

  return (
    <SessionProvider>
      <QuestsProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </QuestsProvider>
    </SessionProvider>
  );
}

function RootNavigator() {
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <LoadingScreen message="Opening your quest log..." />;
  }

  const signedIn = Boolean(session);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
    </Stack>
  );
}
