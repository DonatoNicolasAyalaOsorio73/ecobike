import { ACHIEVEMENTS, type RiderStats } from "@/types/achievement";
import type { Ride } from "@/types/ride";
import { analyzeTrack, downsample, sanitizeTrack, scoreRide, type TrackSample } from "@/utils/rideScore";
import { verifiedRides } from "@/utils/verified";
import { longestStreak } from "@/utils/streak";

/** The ride's GPS track in the compact form the server verifies. */
export function rideTrack(ride: Ride): TrackSample[] {
  return downsample(ride.points).map((p) => [Math.round(p.lat * 1e6) / 1e6, Math.round(p.lng * 1e6) / 1e6, p.timestamp] as TrackSample);
}

/** The server's verdict on a ride before caps (same rules, see rideScore.ts): points and, when 0, why. */
export function scoreLocalRide(ride: Ride) {
  return scoreRide(ride.distanceMeters, ride.durationSeconds, analyzeTrack(sanitizeTrack(rideTrack(ride), ride.startedAt, ride.endedAt ?? Date.now())));
}

/** Points the server will award before daily caps; 0 if it isn't a verifiable bike ride. */
export function pointsForRide(ride: Ride): number {
  return scoreLocalRide(ride).points;
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
    (a) => !alreadyUnlocked.has(a.code) && a.progress(stats) >= 1
  );
}

/**
 * Gamification stats over a ride history, counting VERIFIED rides only
 * (rides that earned points): achievements can't be completed with walks,
 * car trips or fake GPS.
 */
export function computeRiderStats(all: Ride[]): RiderStats {
  const rides = verifiedRides(all);
  return {
    totalRides: rides.length,
    totalDistanceMeters: rides.reduce((s, r) => s + r.distanceMeters, 0),
    totalDurationSeconds: rides.reduce((s, r) => s + r.durationSeconds, 0),
    bestRide: rides.reduce<Ride | null>((best, r) => (!best || r.distanceMeters > best.distanceMeters ? r : best), null),
    currentStreakDays: computeStreakDays(rides.map((r) => new Date(r.startedAt))),
    bestStreakDays: longestStreak(rides),
    totalPoints: rides.reduce((s, r) => s + r.pointsEarned, 0),
  };
}

/** Current streak in days, counting only verified (point-earning) rides. */
export function streakDays(rides: Ride[]): number {
  return computeStreakDays(verifiedRides(rides).map((r) => new Date(r.startedAt)));
}

/**
 * Unlocked achievements that the verified history actually supports. Drops
 * anything unlocked before verification existed (or by tampering with local
 * data); every progress function is cumulative, so legit ones always stay.
 */
export function validAchievements(unlocked: Set<string>, stats: RiderStats): Set<string> {
  return new Set([...unlocked].filter((code) => (ACHIEVEMENTS.find((a) => a.code === code)?.progress(stats) ?? 0) >= 1));
}
