import { useAuthStore } from "@/stores/authStore";
import { useRiderStats } from "./useRiderStats";
import { getLocalRedemptions } from "@/services/rewards.service";

/**
 * Points balance has two sources of truth depending on account type:
 *  - real account: `usuarios/{uid}.puntosAcumulados` in Firestore — the
 *    same field the mobile app reads/writes, kept in sync by
 *    auth.service.ts's addPointsToProfile() and rewards.service.ts's
 *    transaction.
 *  - guest/offline: computed from locally-tracked ride history minus local
 *    redemptions (services/db.ts), since there's no account to hold a
 *    server-side balance.
 */
export function useAvailablePoints(userId: string | null) {
  const profile = useAuthStore((s) => s.profile);
  const { stats } = useRiderStats(userId);

  if (profile) {
    return { points: profile.puntosAcumulados, isRealAccount: true };
  }
  const spentLocally = userId ? getLocalRedemptions(userId).reduce((sum, r) => sum + r.pointsSpent, 0) : 0;
  return { points: Math.max(0, stats.totalPoints - spentLocally), isRealAccount: false };
}
