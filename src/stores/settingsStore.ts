import { create } from "zustand";
import { kvGetJson, kvSetJson } from "@/services/kv";
import { DEFAULT_SETTINGS, type UserSettings } from "@/types/user";

const KEY = "ecobike_settings_v1";

const readStorage = () => kvGetJson<Partial<UserSettings>>(KEY);
const writeStorage = (value: UserSettings) => kvSetJson(KEY, value);

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
