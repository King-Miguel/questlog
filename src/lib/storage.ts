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
