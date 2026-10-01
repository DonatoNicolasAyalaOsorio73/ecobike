export type AuthProvider = "password" | "google.com" | "apple.com";

// Shaped to match the REAL `usuarios/{uid}` documents in the live EcoBike
// Firebase project (ecobike-9dedd) — the same collection the shipping mobile
// app reads/writes (see the "legacy" section of the deployed Firestore
// rules, which keep it open specifically because profile.tsx/rewards.tsx
// still depend on it). `displayName`/`photoURL`/`friends` here are this
// app's in-memory convenience shape; auth.service.ts maps them to/from the
// real `nombre`+`apellido`/`profileImageUrl`/`amigos` fields on read/write.
// `city`/`bikeType` aren't part of the real schema — they're additive extra
// fields this app writes alongside it, which Firestore (and the mobile app,
// which just ignores unknown fields) tolerates fine.
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  username: string;
  photoURL: string | null;
  city: string | null;
  bikeType: string | null;
  friends: string[];
  puntosAcumulados: number;
  role: "user" | "admin" | "partner";
  createdAt: number;
  providers: AuthProvider[];
  emailVerified: boolean;
}

export type Units = "metric" | "imperial";
export type AppearanceMode = "system" | "light" | "dark";

export interface UserSettings {
  units: Units;
  appearance: AppearanceMode;
  biometricUnlockEnabled: boolean;
  notificationsEnabled: boolean;
  shareStatsWithFriends: boolean;
  shareLocationDuringRide: boolean;
  /** Weekly distance target in kilometres, always stored metric regardless
   * of the display `units` setting so switching units never moves the goal. */
  weeklyGoalKm: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
  units: "metric",
  appearance: "system",
  biometricUnlockEnabled: false,
  notificationsEnabled: true,
  shareStatsWithFriends: true,
  shareLocationDuringRide: false,
  weeklyGoalKm: 30,
};
