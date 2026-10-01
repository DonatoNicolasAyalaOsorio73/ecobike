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
  firstName: string;
  lastName: string;
  bio: string | null;
  /** ISO "AAAA-MM-DD" (legacy field fechaNacimiento). */
  birthDate: string | null;
  gender: string | null;
  experience: string | null;
  ridingGoal: string | null;
  friends: string[];
  puntosAcumulados: number;
  role: "user" | "admin" | "partner";
  createdAt: number;
  providers: AuthProvider[];
  emailVerified: boolean;
}

export type Units = "metric" | "imperial";

export type GpsAccuracy = "high" | "balanced";

/** Device-local preferences (persisted per device by settingsStore). */
export interface UserSettings {
  units: Units;
  biometricUnlockEnabled: boolean;
  /** Master switch for push on this device (token registered or cleared). */
  notificationsEnabled: boolean;
  /** Weekly distance target in kilometres, always stored metric regardless
   * of the display `units` setting so switching units never moves the goal. */
  weeklyGoalKm: number;
  /** Daily points target for the streak card (Duolingo-style daily goal). */
  dailyGoalPoints: number;
  /** Rider weight for calorie estimates. */
  weightKg: number;
  /** Pause automatically when stopped and resume when moving again. */
  autoPause: boolean;
  /** Keep the screen on while a ride is being recorded. */
  keepScreenOn: boolean;
  /** "balanced" trades some GPS precision for battery life. */
  gpsAccuracy: GpsAccuracy;
  /** Local reminder every Sunday evening to check the weekly goal (native). */
  weeklyReminder: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  units: "metric",
  biometricUnlockEnabled: false,
  notificationsEnabled: true,
  weeklyGoalKm: 30,
  dailyGoalPoints: 100,
  weightKg: 70,
  autoPause: true,
  keepScreenOn: true,
  gpsAccuracy: "high",
  weeklyReminder: false,
};

/** Account-level preferences stored on the server (usuarios/{uid}), shared by all devices. */
export interface NotificationPrefs {
  friends: boolean;
  messages: boolean;
}

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = { friends: true, messages: true };
