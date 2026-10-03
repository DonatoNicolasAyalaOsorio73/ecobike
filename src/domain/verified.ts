import type { Ride } from "@/types/ride";

/**
 * A ride counts for gamification (achievements, missions, streak) only if it
 * passed the bike verification: the server's `verified` flag once synced
 * (true even when a daily cap left it at 0 points; false for rides the server
 * rejected or stored before verification existed), the same rules on-device
 * before that (see rideScore.ts). Walks, car
 * trips, fake GPS and too-short rides stay in the history but count for
 * nothing. Gamification never awards points itself: points come only from
 * the server, so none of this can be used to farm them.
 */
type Verifiable = Pick<Ride, "pointsEarned" | "verified">;

export const isVerified = (r: Verifiable) => r.verified ?? r.pointsEarned > 0;

export function verifiedRides<T extends Verifiable>(rides: T[]): T[] {
  return rides.filter(isVerified);
}
