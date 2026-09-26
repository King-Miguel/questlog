import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { authStorage } from './storage';

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();

// Supabase renamed the public key: older projects show an anon key, newer ones
// show a publishable key. Accept either so setup cannot go wrong.
const publicKey = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  ''
).trim();

export const isSupabaseConfigured = url.startsWith('https://') && publicKey.length > 20;

if (!isSupabaseConfigured && __DEV__) {
  console.warn(
    '[questlog] Supabase env vars are missing. Copy .env.example to .env and fill in your project URL and key.',
  );
}

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? publicKey : 'placeholder-key-not-configured',
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
