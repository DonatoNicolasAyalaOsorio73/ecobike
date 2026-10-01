import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "ecobike_local_profile_v1";

export interface LocalProfile {
  displayName: string;
  username: string;
  city: string;
  bikeType: string;
  photoUri: string | null;
}

function randomGuestHandle() {
  return `invitado${Math.floor(1000 + Math.random() * 9000)}`;
}

const DEFAULTS: LocalProfile = {
  displayName: "Ciclista invitado",
  username: randomGuestHandle(),
  city: "",
  bikeType: "",
  photoUri: null,
};

async function readStorage(): Promise<Partial<LocalProfile> | null> {
  try {
    const raw = Platform.OS === "web" ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function writeStorage(profile: LocalProfile) {
  const raw = JSON.stringify(profile);
  if (Platform.OS === "web") localStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

interface LocalProfileState extends LocalProfile {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (patch: Partial<LocalProfile>) => Promise<void>;
}

/**
 * Editable profile fields for a GUEST session — someone exploring the app
 * without a Firebase account still gets a real, persisted name/city/bike
 * instead of "Editar perfil" being a dead end until they sign up.
 */
export const useLocalProfileStore = create<LocalProfileState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const stored = await readStorage();
    const merged = { ...DEFAULTS, ...stored };
    set({ ...merged, hydrated: true });
    // Persist on first run so the random guest handle is stable across
    // restarts instead of being re-rolled every cold start.
    if (!stored) await writeStorage(merged);
  },

  update: async (patch) => {
    const next = { ...get(), ...patch };
    set(patch);
    const { hydrated: _h, hydrate: _hy, update: _u, ...profile } = next;
    await writeStorage(profile);
  },
}));
