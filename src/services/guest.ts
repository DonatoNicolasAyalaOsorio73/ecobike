import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const GUEST_ID_KEY = "ecobike_guest_id_v1";

/** Stable per-device id that keys a signed-out guest's local data. */
export async function getOrCreateGuestId(): Promise<string> {
  const read = Platform.OS === "web" ? localStorage.getItem(GUEST_ID_KEY) : await SecureStore.getItemAsync(GUEST_ID_KEY);
  if (read) return read;
  const id = `guest_${Crypto.randomUUID()}`;
  if (Platform.OS === "web") localStorage.setItem(GUEST_ID_KEY, id);
  else await SecureStore.setItemAsync(GUEST_ID_KEY, id);
  return id;
}

const GUEST_MODE_KEY = "ecobike_guest_mode_v1";

/** Remembers "Explorar sin cuenta" so a reload (web) or relaunch keeps the guest inside the app. */
export async function setGuestMode(on: boolean) {
  try {
    if (Platform.OS === "web") {
      if (on) localStorage.setItem(GUEST_MODE_KEY, "1");
      else localStorage.removeItem(GUEST_MODE_KEY);
    } else if (on) await SecureStore.setItemAsync(GUEST_MODE_KEY, "1");
    else await SecureStore.deleteItemAsync(GUEST_MODE_KEY);
  } catch {
    // storage unavailable (private mode): guest just won't persist
  }
}

export async function isGuestMode(): Promise<boolean> {
  try {
    return (Platform.OS === "web" ? localStorage.getItem(GUEST_MODE_KEY) : await SecureStore.getItemAsync(GUEST_MODE_KEY)) === "1";
  } catch {
    return false;
  }
}
