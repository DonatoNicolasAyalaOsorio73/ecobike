// TypeScript always resolves "@firebase/auth"'s "types" export condition to
// its platform-generic auth-public.d.ts (that condition wins outright over
// "react-native" during type resolution — see src/services/firebase.ts),
// so `getReactNativePersistence` never shows up there even though the real
// React Native build genuinely exports it at runtime (Metro's own resolver
// isn't affected by this quirk). This augmentation just tells TS about the
// function that's actually there.
import type { Persistence, ReactNativeAsyncStorage } from "@firebase/auth";

declare module "@firebase/auth" {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
