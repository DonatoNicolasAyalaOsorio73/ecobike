/** Web version of kv.ts: localStorage, same API and the same error handling. */
export async function kvGet(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable or full: the value just won't persist
  }
}

export async function kvDelete(key: string): Promise<void> {
  try {
    localStorage.removeItem(key);
  } catch {
    // nothing to do
  }
}

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
