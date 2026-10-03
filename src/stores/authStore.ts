import { create } from "zustand";
import type { User } from "firebase/auth";
import { fetchUserProfile, signOut as firebaseSignOut, subscribeToAuthState } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { api } from "@/services/api";
import { getOrCreateGuestId, isGuestMode, setGuestMode } from "@/services/guest";
import { seedDemoIfEmpty } from "@/services/demo.service";
import { setMonitoringUser } from "@/services/monitoring";
import { initDb, unsyncedRides, wipeAllLocalData } from "@/services/db";
import { syncPendingRides } from "@/services/rides.service";
import { Platform } from "react-native";
import { E2E_SESSION } from "@/services/e2e";
import type { UserProfile } from "@/types/user";

export type SessionStatus = "loading" | "signedOut" | "locked" | "signedIn";

interface AuthState {
  status: SessionStatus;
  firebaseUser: User | null;
  profile: UserProfile | null;
  isGuest: boolean;
  init: (biometricUnlockEnabled: boolean) => void;
  continueAsGuest: () => Promise<void>;
  confirmBiometricUnlock: () => void;
  signOut: () => Promise<void>;
  deleteLocalDataOnly: () => void;
  refreshProfile: () => Promise<void>;
}

let unsubscribe: (() => void) | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  firebaseUser: null,
  profile: null,
  isGuest: false,

  init: (biometricUnlockEnabled: boolean) => {
    if (E2E_SESSION) {
      // Test build only (see services/e2e.ts): a signed-in account without Firebase Auth.
      initDb();
      const s = E2E_SESSION;
      set({ status: "signedIn", isGuest: false, profile: s.profile, firebaseUser: { uid: s.uid, email: s.profile.email, emailVerified: true, providerData: [], getIdToken: async () => s.token } as unknown as User });
      return;
    }
    if (!isFirebaseConfigured) {
      isGuestMode().then((guest) => (guest ? get().continueAsGuest() : set({ status: "signedOut" })));
      return;
    }
    unsubscribe?.();
    unsubscribe = subscribeToAuthState(async (user) => {
      setMonitoringUser(user?.uid ?? null);
      if (!user) {
        if (await isGuestMode()) return get().continueAsGuest();
        set({ status: "signedOut", firebaseUser: null, profile: null, isGuest: false });
        return;
      }
      await setGuestMode(false);
      initDb();
      const profile = await fetchUserProfile(user.uid).catch(() => null);
      // Keep the public mirror (search/ranking) in sync, incl. legacy accounts.
      if (profile) api("me", "POST").catch(() => {});
      set({
        firebaseUser: user,
        profile,
        isGuest: false,
        status: biometricUnlockEnabled ? "locked" : "signedIn",
      });
    });
  },

  // Local-first tracking/history/stats need no backend at all — letting
  // someone in without an account keeps the app usable even with no
  // Firebase project configured yet (rule: keep working even when a
  // capability isn't available), and remains a normal "skip sign-in for
  // now" option once one is.
  continueAsGuest: async () => {
    // Demo mode: a guest starts with a realistic history so every screen has data.
    try {
      const guestId = await getOrCreateGuestId();
      initDb();
      seedDemoIfEmpty(guestId);
    } catch {
      // Demo data is a nicety; never block entering the app.
    }
    await setGuestMode(true);
    set({ status: "signedIn", isGuest: true, firebaseUser: null, profile: null });
  },

  confirmBiometricUnlock: () => {
    if (get().firebaseUser) set({ status: "signedIn" });
  },

  signOut: async () => {
    if (get().isGuest) {
      await setGuestMode(false);
      set({ status: "signedOut", isGuest: false });
      return;
    }
    const uid = get().firebaseUser?.uid;
    // Web: a shared browser must not keep this person's GPS history (home,
    // work...) for the next one (AD-14). Upload what's pending first, and
    // never wipe a ride that only exists here.
    if (Platform.OS === "web" && uid) {
      await syncPendingRides(uid).catch(() => 0);
      if (unsyncedRides(uid).length === 0) wipeAllLocalData(uid);
    }
    await firebaseSignOut();
    set({ status: "signedOut", firebaseUser: null, profile: null });
  },

  deleteLocalDataOnly: () => {
    const uid = get().firebaseUser?.uid;
    if (uid) wipeAllLocalData(uid);
  },

  refreshProfile: async () => {
    const uid = get().firebaseUser?.uid;
    if (!uid || E2E_SESSION) return;
    // A failed refresh (offline) keeps the last known profile instead of
    // dropping to null, which other code would read as "no account".
    const profile = await fetchUserProfile(uid).catch(() => undefined);
    if (profile !== undefined) set({ profile });
  },
}));
