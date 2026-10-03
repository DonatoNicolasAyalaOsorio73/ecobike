import * as SecureStore from "expo-secure-store";

/**
 * Small device key-value storage (settings, local profile, guest id). Native:
 * the OS keychain/keystore via SecureStore. Web: see kv.web.ts. Every call
 * swallows storage errors (private mode, full or locked storage): callers get
 * null / nothing and keep working with defaults.
 */
export async function kvGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value).catch(() => {});
}

export async function kvDelete(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

/** JSON helpers: a corrupt value reads as null instead of throwing. */
export async function kvGetJson<T>(key: string): Promise<T | null> {
  const raw = await kvGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const kvSetJson = (key: string, value: unknown) => kvSet(key, JSON.stringify(value));
