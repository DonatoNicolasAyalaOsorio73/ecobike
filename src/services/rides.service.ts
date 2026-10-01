import { collection, getDocs } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
import { getRide, listRides, markSynced, saveRide, unsyncedRides } from "./db";
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

/**
 * Pulls ride summaries already stored in `usuarios/{uid}/rides` that this
 * device doesn't have (new phone, reinstall, web <-> mobile). GPS polylines
 * are never uploaded, so pulled rides have no map trace. Returns how many
 * were added.
 */
export async function pullRemoteRides(userId: string): Promise<number> {
  if (!isFirebaseConfigured) return 0;
  const snap = await getDocs(collection(getDb(), "usuarios", userId, "rides"));
  let added = 0;
  for (const d of snap.docs) {
    if (getRide(d.id)) continue;
    const r = d.data();
    const num = (v: unknown) => (typeof v === "number" ? v : 0);
    if (!num(r.startedAt)) continue; // legacy docs with another shape
    saveRide({
      id: d.id,
      userId,
      startedAt: num(r.startedAt),
      endedAt: num(r.endedAt) || null,
      distanceMeters: num(r.distanceMeters),
      durationSeconds: num(r.durationSeconds),
      avgSpeedKmh: num(r.avgSpeedKmh),
      maxSpeedKmh: num(r.maxSpeedKmh),
      elevationGainMeters: num(r.elevationGainMeters),
      caloriesKcal: num(r.caloriesKcal),
      points: [],
      pointsEarned: num(r.pointsEarned),
      synced: true,
      error: null,
    });
    added++;
  }
  return added;
}
