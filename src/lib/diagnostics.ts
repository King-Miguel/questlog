import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  isSupabaseConfigured,
  supabaseKey,
  supabaseUrl,
} from './supabase';

const rawUrl = supabaseUrl;
const rawKey = supabaseKey;

export type ConfigSnapshot = {
  configured: boolean;
  url: string;
  host: string;
  key: string;
  keyLabel: string;
  keyLength: number;
  demoEmail: string;
  demoPassword: string;
  demoPasswordLength: number;
  demoConfigured: boolean;
};

export function configSnapshot(): ConfigSnapshot {
  let host = '(invalid or missing URL)';
  try {
    host = new URL(rawUrl).host;
  } catch {
    // keep the fallback
  }

  const keyLabel = rawKey.startsWith('sb_publishable_')
    ? 'publishable'
    : rawKey.startsWith('sb_secret_')
      ? 'SECRET KEY - WRONG KEY'
      : rawKey.startsWith('eyJ')
        ? 'legacy anon JWT'
        : rawKey.length > 0
          ? 'unrecognised'
          : '(missing)';

  return {
    configured: isSupabaseConfigured,
    url: rawUrl,
    host,
    key: rawKey,
    keyLabel,
    keyLength: rawKey.length,
    demoEmail: DEMO_EMAIL,
    demoPassword: DEMO_PASSWORD,
    demoPasswordLength: DEMO_PASSWORD.length,
    demoConfigured: DEMO_EMAIL.length > 0 && DEMO_PASSWORD.length > 0,
  };
}

export type ProbeResult = {
  ok: boolean;
  host: string;
  status: number | null;
  code: string | null;
  message: string;
  userId: string | null;
};

// Calls the same Auth endpoint the SDK uses, with a throwaway fetch. It never
// touches the app's own session, so it is safe to run while signed in or out.
export async function probeCredentials(email: string, password: string): Promise<ProbeResult> {
  const snap = configSnapshot();
  const base: ProbeResult = {
    ok: false,
    host: snap.host,
    status: null,
    code: null,
    message: '',
    userId: null,
  };

  if (!snap.configured) {
    return { ...base, message: 'Supabase URL or key is missing. Check .env and rebuild with --clear.' };
  }

  try {
    const response = await fetch(
      `${snap.url.replace(/\/$/, '')}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: { apikey: snap.key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      },
    );

    let payload: Record<string, unknown> = {};
    try {
      payload = await response.json();
    } catch {
      // non-JSON error body, fall through to the status text
    }

    const message =
      (typeof payload.msg === 'string' && payload.msg) ||
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error_description === 'string' && payload.error_description) ||
      `HTTP ${response.status}`;

    const code =
      (typeof payload.error_code === 'string' && payload.error_code) ||
      (typeof payload.code === 'string' && payload.code) ||
      null;

    if (!response.ok) {
      return { ...base, status: response.status, code, message };
    }

    const user = payload.user as { id?: string } | undefined;
    return {
      ...base,
      ok: true,
      status: response.status,
      message: 'Credentials accepted. Supabase returned a session.',
      userId: typeof user?.id === 'string' ? user.id : null,
    };
  } catch (error) {
    return {
      ...base,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export function explainProbe(result: ProbeResult): string {
  if (result.ok) return 'These credentials work. If the app still fails, its bundled env values are stale.';

  const message = result.message.toLowerCase();
  if (message.includes('invalid login credentials')) {
    return 'Supabase rejected the email or password. Either the password is different, or you are pointed at a different Supabase project.';
  }
  if (message.includes('email not confirmed')) {
    return 'The user exists but the email is unconfirmed. Recreate it with Auto Confirm User, or turn off Confirm email.';
  }
  if (message.includes('too many') || message.includes('rate limit')) {
    return 'Supabase rate limited the attempts. Wait a minute and try again.';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Could not reach Supabase. Check the project URL and your connection.';
  }
  if (message.includes('invalid api key') || message.includes('no api key')) {
    return 'The API key is wrong. Use the anon or publishable key, never the secret key.';
  }
  return result.message;
}
