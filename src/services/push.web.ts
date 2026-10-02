// Web has no push (expo-notifications isn't supported there). Importing it
// only produced console warnings, and disablePush() from a browser would
// have cleared the token of the user's phone. Same API, no-ops.
export async function enablePush(_uid: string): Promise<boolean> {
  return false;
}

export async function disablePush(_uid: string) {}

export function listenForPushTaps(_open: (path: string) => void): () => void {
  return () => {};
}
