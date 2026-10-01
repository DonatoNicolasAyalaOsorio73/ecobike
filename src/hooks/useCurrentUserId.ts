import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { useAuthStore } from "@/stores/authStore";

const GUEST_ID_KEY = "ecobike_guest_id_v1";

async function getOrCreateGuestId(): Promise<string> {
  const read = Platform.OS === "web" ? localStorage.getItem(GUEST_ID_KEY) : await SecureStore.getItemAsync(GUEST_ID_KEY);
  if (read) return read;
  const id = `guest_${Crypto.randomUUID()}`;
  if (Platform.OS === "web") localStorage.setItem(GUEST_ID_KEY, id);
  else await SecureStore.setItemAsync(GUEST_ID_KEY, id);
  return id;
}

/**
 * Rides/stats/history all need *a* stable id to key local storage by, even
 * with no Firebase project configured — otherwise the app's core feature
 * (tracking) would be dead on arrival for anyone who hasn't set up a
 * backend yet. Falls back to a per-device guest id in that case.
 */
export function useCurrentUserId(): string | null {
  const firebaseUid = useAuthStore((s) => s.firebaseUser?.uid);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUid) getOrCreateGuestId().then(setGuestId);
  }, [firebaseUid]);

  return firebaseUid ?? guestId;
}
