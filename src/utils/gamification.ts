import { ACHIEVEMENTS, type RiderStats } from "@/types/achievement";
import type { Ride } from "@/types/ride";

const POINTS_PER_KM = 10;
const POINTS_PER_COMPLETED_RIDE = 20;

export function pointsForRide(ride: Ride): number {
  const km = ride.distanceMeters / 1000;
  return Math.round(km * POINTS_PER_KM + POINTS_PER_COMPLETED_RIDE);
}

// Level thresholds are cumulative points; extend this table to add levels
// without touching any other gamification code.
const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500, 3000, 6000, 12000];

export function levelForPoints(totalPoints: number): { level: number; nextLevelAt: number | null } {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  const nextLevelAt = LEVEL_THRESHOLDS[level] ?? null;
  return { level, nextLevelAt };
}

/** Given full ride history (most recent last), computes the current
 * consecutive-day streak, treating "today" and "yesterday" as still active
 * so a streak doesn't reset just because today's ride hasn't happened yet. */
export function computeStreakDays(rideDates: Date[]): number {
  if (rideDates.length === 0) return 0;
  const days = new Set(rideDates.map((d) => startOfDayKey(d)));
  let streak = 0;
  const cursor = new Date();
  // allow the streak to still count if today has no ride yet
  if (!days.has(startOfDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(startOfDayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function startOfDayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function evaluateAchievements(stats: RiderStats, alreadyUnlocked: Set<string>) {
  return ACHIEVEMENTS.filter(
    (a) => !alreadyUnlocked.has(a.code) && a.isUnlocked(stats)
  );
}
