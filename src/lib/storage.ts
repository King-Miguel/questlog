import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export type StorageAdapter = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

function browserStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

// AsyncStorage throws outside a browser, so web uses localStorage with a safe fallback.
export const authStorage: StorageAdapter =
  Platform.OS === 'web'
    ? {
        getItem: (key) => browserStorage()?.getItem(key) ?? null,
        setItem: (key, value) => {
          browserStorage()?.setItem(key, value);
        },
        removeItem: (key) => {
          browserStorage()?.removeItem(key);
        },
      }
    : AsyncStorage;

function isAuthKey(key: string): boolean {
  const lower = key.toLowerCase();
  return lower.startsWith('sb-') || lower.includes('supabase');
}

// Wipes only auth keys. Needed when a saved session points at a deleted user.
export async function clearAuthStorage(): Promise<void> {
  if (Platform.OS === 'web') {
    const store = browserStorage();
    if (!store) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && isAuthKey(key)) keys.push(key);
      }
      for (const key of keys) store.removeItem(key);
    } catch {
      return;
    }
    return;
  }

  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(isAuthKey);
    if (authKeys.length > 0) await AsyncStorage.multiRemove(authKeys);
  } catch {
    return;
  }
}
