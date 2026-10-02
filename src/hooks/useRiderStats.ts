import { useCallback, useEffect, useState } from "react";
import { listRides, listUnlockedAchievements } from "@/services/db";
import { computeRiderStats, levelForPoints, validAchievements } from "@/utils/gamification";
import type { Ride } from "@/types/ride";

/**
 * `pointsForLevel` lets a caller override what level/progress is computed
 * from — a real account's level should reflect its real, server-side
 * `puntosAcumulados` (which can already be huge from mobile-app history),
 * not just points earned in rides tracked locally on this device/session.
 */
export function useRiderStats(userId: string | null, pointsForLevel?: number) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [unlockedCodes, setUnlockedCodes] = useState<Set<string>>(new Set());

  const refresh = useCallback(() => {
    if (!userId) return;
    setRides(listRides(userId));
    setUnlockedCodes(new Set(listUnlockedAchievements(userId).map((a) => a.code)));
  }, [userId]);

  useEffect(refresh, [refresh]);

  const stats = computeRiderStats(rides);
  // Only achievements the verified history supports (see validAchievements).
  const validUnlocked = validAchievements(unlockedCodes, stats);

  const { level, nextLevelAt } = levelForPoints(pointsForLevel ?? stats.totalPoints);

  return { rides, stats, unlockedCodes: validUnlocked, level, nextLevelAt, refresh };
}
