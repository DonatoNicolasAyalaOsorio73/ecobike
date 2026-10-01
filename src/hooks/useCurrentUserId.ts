import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getOrCreateGuestId } from "@/services/guest";

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
