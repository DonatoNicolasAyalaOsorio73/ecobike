import { useCallback, useEffect, useState } from "react";
import { listRides, listUnlockedAchievements } from "@/services/db";
import { computeStreakDays, levelForPoints } from "@/utils/gamification";
import type { Ride } from "@/types/ride";
import type { RiderStats } from "@/types/achievement";

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

  const stats: RiderStats = {
    totalRides: rides.length,
    totalDistanceMeters: rides.reduce((s, r) => s + r.distanceMeters, 0),
    totalDurationSeconds: rides.reduce((s, r) => s + r.durationSeconds, 0),
    bestRide: rides.reduce<Ride | null>((best, r) => (!best || r.distanceMeters > best.distanceMeters ? r : best), null),
    currentStreakDays: computeStreakDays(rides.map((r) => new Date(r.startedAt))),
    totalPoints: rides.reduce((s, r) => s + r.pointsEarned, 0),
  };

  const { level, nextLevelAt } = levelForPoints(pointsForLevel ?? stats.totalPoints);

  return { rides, stats, unlockedCodes, level, nextLevelAt, refresh };
}
