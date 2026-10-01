import { create } from "zustand";

export type ToastKind = "success" | "error" | "info";

interface ToastState {
  message: string | null;
  kind: ToastKind;
  /** Bumped on every show so the banner re-animates even for an identical message. */
  token: number;
  show: (message: string, kind?: ToastKind) => void;
  hide: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: "info",
  token: 0,

  show: (message, kind = "info") => {
    if (hideTimer) clearTimeout(hideTimer);
    set((s) => ({ message, kind, token: s.token + 1 }));
    // Errors stay longer — they're the ones worth reading twice.
    hideTimer = setTimeout(() => set({ message: null }), kind === "error" ? 5000 : 3000);
  },

  hide: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message: null });
  },
}));

/** Imperative helper for non-component code (services, stores). */
export const toast = {
  success: (m: string) => useToastStore.getState().show(m, "success"),
  error: (m: string) => useToastStore.getState().show(m, "error"),
  info: (m: string) => useToastStore.getState().show(m, "info"),
};
