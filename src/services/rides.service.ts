import { doc, getDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
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
  // The server (api/rides.js) validates the ride, computes the points and
  // writes `usuarios/{uid}/rides/{id}` + `puntosAcumulados` atomically.
  // Clients can no longer write either (firestore.rules). Idempotent by id,
  // so retries never double-award.
  try {
    await api("rides", "POST", {
      id: ride.id,
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
      distanceMeters: ride.distanceMeters,
      durationSeconds: ride.durationSeconds,
      avgSpeedKmh: ride.avgSpeedKmh,
      maxSpeedKmh: ride.maxSpeedKmh,
      elevationGainMeters: ride.elevationGainMeters,
      caloriesKcal: ride.caloriesKcal,
      // Full GPS polyline stays local-only (privacy, small docs).
    });
  } catch (e: any) {
    // 4xx = the server rejected this ride for good (implausible data);
    // stop retrying it. Network/5xx errors stay unsynced and retry later.
    if (!(e?.status >= 400 && e?.status < 500 && e?.status !== 401)) throw e;
  }
  markSynced(ride.id);
}

/** Returns how many rides were synced, so callers know whether to refresh the balance. */
export async function syncPendingRides(userId: string): Promise<number> {
  if (!isFirebaseConfigured) return 0;
  let synced = 0;
  for (const ride of unsyncedRides(userId)) {
    try {
      await queueRideForSync(ride);
      synced++;
    } catch {
      // leave it unsynced, retry next time syncPendingRides runs
    }
  }
  return synced;
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
