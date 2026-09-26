import { Redirect } from 'expo-router';

import { LoadingScreen } from '@/components/ui';
import { useSession } from '@/providers/session';

export default function Index() {
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <LoadingScreen message="Opening your quest log..." />;
  }

  return <Redirect href={session ? '/home' : '/login'} />;
}
