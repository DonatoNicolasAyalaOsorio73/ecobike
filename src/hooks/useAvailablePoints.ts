import { useAuthStore } from "@/stores/authStore";
import { useRiderStats } from "./useRiderStats";
import { getLocalRedemptions } from "@/services/rewards.service";

/**
 * Points balance has two sources of truth depending on account type:
 *  - real account: `usuarios/{uid}.puntosAcumulados`, written only by the
 *    server (api/). Real = signed in with Firebase (not the profile having
 *    loaded): a failed profile fetch must never turn a real account into a
 *    guest with a local balance and locally invented codes (spine AD-11).
 *    Until the profile loads the balance shows 0 and the server decides.
 *  - guest: demo points from local ride history minus local redemptions.
 */
export function useAvailablePoints(userId: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const signedIn = useAuthStore((s) => !!s.firebaseUser && !s.isGuest);
  const { stats } = useRiderStats(userId);

  if (signedIn || profile) {
    return { points: profile?.puntosAcumulados ?? 0, isRealAccount: true, profileReady: !!profile };
  }
  const spentLocally = userId ? getLocalRedemptions(userId).reduce((sum, r) => sum + r.pointsSpent, 0) : 0;
  return { points: Math.max(0, stats.totalPoints - spentLocally), isRealAccount: false, profileReady: true };
}
