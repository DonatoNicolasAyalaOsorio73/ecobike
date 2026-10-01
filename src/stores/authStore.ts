import { create } from "zustand";
import type { User } from "firebase/auth";
import { fetchUserProfile, signOut as firebaseSignOut, subscribeToAuthState } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { api } from "@/services/api";
import { initDb, wipeAllLocalData } from "@/services/db";
import type { UserProfile } from "@/types/user";

export type SessionStatus = "loading" | "signedOut" | "locked" | "signedIn";

interface AuthState {
  status: SessionStatus;
  firebaseUser: User | null;
  profile: UserProfile | null;
  isGuest: boolean;
  init: (biometricUnlockEnabled: boolean) => void;
  continueAsGuest: () => void;
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
    if (!isFirebaseConfigured) {
      set({ status: "signedOut" });
      return;
    }
    unsubscribe?.();
    unsubscribe = subscribeToAuthState(async (user) => {
      if (!user) {
        set({ status: "signedOut", firebaseUser: null, profile: null, isGuest: false });
        return;
      }
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
  continueAsGuest: () => {
    set({ status: "signedIn", isGuest: true, firebaseUser: null, profile: null });
  },

  confirmBiometricUnlock: () => {
    if (get().firebaseUser) set({ status: "signedIn" });
  },

  signOut: async () => {
    if (get().isGuest) {
      set({ status: "signedOut", isGuest: false });
      return;
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
    if (!uid) return;
    const profile = await fetchUserProfile(uid).catch(() => null);
    set({ profile });
  },
}));
