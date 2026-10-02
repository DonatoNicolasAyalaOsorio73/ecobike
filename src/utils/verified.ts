import type { Ride } from "@/types/ride";

/**
 * A ride counts for gamification (achievements, missions, streak) only if it
 * earned points, i.e. it passed the bike verification (server-side once
 * synced, same rules on-device before that; see rideScore.ts). Walks, car
 * trips, fake GPS and too-short rides stay in the history but count for
 * nothing. Gamification never awards points itself: points come only from
 * the server, so none of this can be used to farm them.
 */
export const isVerified = (r: Pick<Ride, "pointsEarned">) => r.pointsEarned > 0;

export function verifiedRides<T extends Pick<Ride, "pointsEarned">>(rides: T[]): T[] {
  return rides.filter(isVerified);
}
