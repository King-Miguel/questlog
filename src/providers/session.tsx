import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { describeAuthError, ensureProfile, updateProfile } from '@/lib/api';
import type { Profile } from '@/lib/game';
import { clearAuthStorage } from '@/lib/storage';
import { DEMO_EMAIL, DEMO_PASSWORD, hasDemoAccount, isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AuthResult = {
  error: string | null;
  needsEmailConfirmation?: boolean;
};

type SessionValue = {
  isLoading: boolean;
  session: Session | null;
  profile: Profile | null;
  profileLoading: boolean;
  profileError: string | null;
  lastAuthError: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  signInWithDemo: (email?: string, password?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  clearSavedSession: () => Promise<void>;
  saveDisplayName: (name: string) => Promise<AuthResult>;
  reloadProfile: () => Promise<void>;
  demoAvailable: boolean;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

async function hardResetSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // A dead refresh token makes the server call fail. Clear local state anyway.
  }
  await clearAuthStorage();
}

// Only treat a real auth rejection as a dead session. A network outage must
// not silently sign someone out while they are offline.
function isAuthRejection(error: { status?: number; message?: string } | null): boolean {
  if (!error) return false;
  const status = error.status ?? 0;
  if ([400, 401, 403, 404, 422].includes(status)) return true;
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('invalid') ||
    message.includes('not found') ||
    message.includes('expired') ||
    message.includes('revoked')
  );
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Keep this synchronous: calling Supabase here can deadlock the auth lock.
      setSession(nextSession);
    });

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        const candidate = data.session ?? null;

        if (candidate) {
          const { error } = await supabase.auth.getUser();
          if (!active) return;
          if (isAuthRejection(error)) {
            // Saved JWT belongs to a deleted user or a revoked refresh token.
            await hardResetSession();
            if (active) setSession(null);
            return;
          }
        }

        if (active) setSession(candidate);
      } catch {
        if (active) setProfileError('Could not read your saved session.');
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const reloadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    setProfileError(null);
    try {
      const fallbackName = session?.user?.user_metadata?.display_name ?? null;
      const next = await ensureProfile(userId, fallbackName);
      setProfile(next);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not load your profile.');
    } finally {
      setProfileLoading(false);
    }
  }, [userId, session?.user?.user_metadata?.display_name]);

  useEffect(() => {
    void reloadProfile();
  }, [reloadProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setLastAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setLastAuthError(error.message);
        return { error: describeAuthError(error.message) };
      }
      return { error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed.';
      setLastAuthError(message);
      return { error: message };
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string): Promise<AuthResult> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) return { error: describeAuthError(error.message) };
        if (!data.session) return { error: null, needsEmailConfirmation: true };
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Sign up failed.' };
      }
    },
    [],
  );

  const signInWithDemo = useCallback(
    async (email?: string, password?: string): Promise<AuthResult> => {
      return signIn(email ?? DEMO_EMAIL, password ?? DEMO_PASSWORD);
    },
    [signIn],
  );

  const signOut = useCallback(async () => {
    await hardResetSession();
    setProfile(null);
    setSession(null);
  }, []);

  const clearSavedSession = useCallback(async () => {
    await hardResetSession();
    setProfile(null);
    setProfileError(null);
    setLastAuthError(null);
    setSession(null);
  }, []);

  const saveDisplayName = useCallback(
    async (name: string): Promise<AuthResult> => {
      if (!userId) return { error: 'You are not signed in.' };
      const clean = name.trim();
      if (clean.length === 0) return { error: 'Display name cannot be empty.' };
      if (clean.length > 60) return { error: 'Keep the display name under 60 characters.' };
      try {
        const next = await updateProfile(userId, { display_name: clean });
        setProfile(next);
        return { error: null };
      } catch (error) {
        return { error: error instanceof Error ? error.message : 'Could not save your name.' };
      }
    },
    [userId],
  );

  const value = useMemo<SessionValue>(
    () => ({
      isLoading,
      session,
      profile,
      profileLoading,
      profileError,
      lastAuthError,
      signIn,
      signUp,
      signInWithDemo,
      signOut,
      clearSavedSession,
      saveDisplayName,
      reloadProfile,
      demoAvailable: hasDemoAccount,
    }),
    [
      isLoading,
      session,
      profile,
      profileLoading,
      profileError,
      lastAuthError,
      signIn,
      signUp,
      signInWithDemo,
      signOut,
      clearSavedSession,
      saveDisplayName,
      reloadProfile,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
