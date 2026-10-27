import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { authStorage } from './storage';

export const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();

// Older projects issue an anon key, newer ones a publishable key. Accept either.
// Pick the first NON-EMPTY value: an empty env var is still a defined string,
// so plain ?? would stop here and ignore a perfectly good publishable key.
export const supabaseKey =
  [
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ]
    .map((value) => (value ?? '').trim())
    .find((value) => value.length > 0) ?? '';

export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 20;

if (!isSupabaseConfigured && __DEV__) {
  console.warn(
    '[questlog] Supabase env vars are missing. Copy .env.example to .env and fill in your project URL and key.',
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseKey : 'placeholder-key-not-configured',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export const DEMO_EMAIL = (process.env.EXPO_PUBLIC_DEMO_EMAIL ?? '').trim();
export const DEMO_PASSWORD = (process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? '').trim();
export const hasDemoAccount = DEMO_EMAIL.length > 0 && DEMO_PASSWORD.length > 0;
