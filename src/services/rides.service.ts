import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { getRide, listRides, markSynced, unsyncedRides } from "./db";
import type { Ride } from "@/types/ride";

/**
 * Cloud sync is additive and best-effort: a ride is already durable on-device
 * (services/db.ts) the moment it's saved, before this ever runs. If there's
 * no Firebase project or no network, these calls simply reject and the ride
 * stays flagged unsynced — `retryUnsyncedRidesOnReconnect` (app/_layout.tsx)
 * retries once connectivity actually returns, so nothing is lost either way.
 */
export async function queueRideForSync(ride: Ride) {
  if (!isFirebaseConfigured) return;
  // Real `usuarios/{uid}/rides` subcollection (see firestore.rules) — the
  // earlier `users/{uid}/rides` target was the unimplemented aspirational
  // schema and could never write successfully under the deployed rules.
  await setDoc(doc(getDb(), "usuarios", ride.userId, "rides", ride.id), {
    userId: ride.userId,
    startedAt: ride.startedAt,
    endedAt: ride.endedAt,
    distanceMeters: ride.distanceMeters,
    durationSeconds: ride.durationSeconds,
    avgSpeedKmh: ride.avgSpeedKmh,
    maxSpeedKmh: ride.maxSpeedKmh,
    elevationGainMeters: ride.elevationGainMeters,
    caloriesKcal: ride.caloriesKcal,
    pointsEarned: ride.pointsEarned,
    // Full GPS polyline stays local-only for now to keep Firestore docs small
    // and avoid shipping precise routes to the cloud without an explicit
    // "share route" opt-in (see rule 21, privacy).
  });
  markSynced(ride.id);
}

export async function syncPendingRides(userId: string) {
  if (!isFirebaseConfigured) return;
  const pending = unsyncedRides(userId);
  for (const ride of pending) {
    try {
      await queueRideForSync(ride);
    } catch {
      // leave it unsynced, retry next time syncPendingRides runs
    }
  }
}

export function getLocalRides(userId: string) {
  return listRides(userId);
}

export function getLocalRide(id: string) {
  return getRide(id);
}

// A friend's ride history lives only on their own device (or would require
// Cloud Functions this project doesn't have — see ENVIRONMENT.md), so the
// only real, cross-account signal we can rank friends by is the points
// balance mirrored to `usuarios_public/{uid}` (see auth.service.ts).
export async function fetchFriendsLeaderboard(friendUids: string[]) {
  if (!isFirebaseConfigured || friendUids.length === 0) return [];
  const snaps = await Promise.all(friendUids.map((uid) => getDoc(doc(getDb(), "usuarios_public", uid))));
  const results = snaps.map((snap, i) => {
    const data = snap.data();
    const displayName = [data?.nombre, data?.apellido].filter(Boolean).join(" ") || data?.username || friendUids[i];
    return { uid: friendUids[i], displayName, totalPoints: (data?.puntosAcumulados as number | undefined) ?? 0 };
  });
  return results.sort((a, b) => b.totalPoints - a.totalPoints);
}
