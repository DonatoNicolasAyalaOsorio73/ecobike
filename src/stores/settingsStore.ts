import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { DEFAULT_SETTINGS, type UserSettings } from "@/types/user";

const KEY = "ecobike_settings_v1";

async function readStorage(): Promise<Partial<UserSettings> | null> {
  try {
    const raw =
      Platform.OS === "web" ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeStorage(settings: UserSettings) {
  const raw = JSON.stringify(settings);
  if (Platform.OS === "web") localStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

interface SettingsState extends UserSettings {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<UserSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const stored = await readStorage();
    set({ ...DEFAULT_SETTINGS, ...stored, hydrated: true });
  },

  update: async (patch) => {
    const next = { ...get(), ...patch };
    set(patch);
    const { hydrated: _h, hydrate: _hy, update: _u, ...settings } = next;
    await writeStorage(settings);
  },
}));
