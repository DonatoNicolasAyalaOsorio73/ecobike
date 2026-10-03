import { collection, getDocs, query, where } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";
import { deleteRide, getRide, initDb, listRides, markSynced, saveRide, unlockAchievement, unsyncedRides, wipeAllLocalData } from "./db";
import { computeRiderStats, evaluateAchievements, rideTrack } from "@/utils/gamification";
import type { Ride } from "@/types/ride";

/**
 * Cloud sync is additive and best-effort: a ride is already durable on-device
 * (services/db.ts) the moment it's saved, before this ever runs. If there's
 * no Firebase project or no network, these calls simply reject and the ride
 * stays flagged unsynced — `retryUnsyncedRidesOnReconnect` (app/_layout.tsx)
 * retries once connectivity actually returns, so nothing is lost either way.
 */
/**
 * Server answers that mean "this ride will never be accepted" (bad data,
 * overlap with another ride). Anything else — 401 expired token, 404 profile
 * not created yet, 429, 5xx, offline — is retried later, never zeroed (AD-12).
 */
const PERMANENT_REJECTIONS = new Set([400, 403, 409, 413, 422]);

export async function queueRideForSync(ride: Ride) {
  if (!isFirebaseConfigured) return;
  // The server (api/rides.js) validates the ride, computes the points and
  // writes `usuarios/{uid}/rides/{id}` + `puntosAcumulados` atomically.
  // Clients can no longer write either (firestore.rules). Idempotent by id,
  // so retries never double-award.
  try {
    const res = await api<{ pointsEarned?: number; verified?: boolean; reason?: string | null }>("rides", "POST", {
      id: ride.id,
      startedAt: ride.startedAt,
      endedAt: ride.endedAt,
      distanceMeters: ride.distanceMeters,
      durationSeconds: ride.durationSeconds,
      avgSpeedKmh: ride.avgSpeedKmh,
      maxSpeedKmh: ride.maxSpeedKmh,
      elevationGainMeters: ride.elevationGainMeters,
      caloriesKcal: ride.caloriesKcal,
      // Downsampled track for server-side bike verification only: the server
      // analyses it and discards it (the polyline is never stored remotely).
      track: rideTrack(ride),
    });
    // The server is the authority on points, verification and the reason:
    // keep the local history in agreement with what was actually awarded.
    if (typeof res?.pointsEarned === "number") {
      saveRide({ ...ride, pointsEarned: res.pointsEarned, verified: res.verified ?? res.pointsEarned > 0, pointsReason: res.reason ?? null });
    }
  } catch (e: any) {
    // 4xx = the server rejected this ride for good (implausible data); stop
    // retrying it, and it earns nothing locally either (no achievements,
    // missions or streak from a ride the server refused). Network/5xx errors
    // stay unsynced and retry later.
    if (!PERMANENT_REJECTIONS.has(e?.status)) throw e;
    saveRide({ ...ride, pointsEarned: 0, verified: false, pointsReason: e?.message ?? "El servidor rechazó este recorrido." });
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
  // Incremental: a device that already has history only asks for the last
  // week (new rides from other devices + recent server verdicts), instead of
  // re-downloading every ride on each start. An empty device gets everything.
  const local = listRides(userId);
  const byId = new Map(local.map((r) => [r.id, r]));
  const newest = local.filter((r) => r.synced).reduce((m, r) => Math.max(m, r.startedAt), 0);
  const rides = collection(getDb(), "usuarios", userId, "rides");
  const snap = await getDocs(newest ? query(rides, where("startedAt", ">", newest - 7 * 86_400_000)) : rides);
  let added = 0;
  for (const d of snap.docs) {
    const r = d.data();
    const num = (v: unknown) => (typeof v === "number" ? v : 0);
    // Server docs without the flag predate bike verification: never count them as verified.
    const verified = r.verified === true;
    const known = byId.get(d.id);
    if (known) {
      // The server's word on points/verification wins over what this device computed.
      if (known.synced && (known.pointsEarned !== num(r.pointsEarned) || known.verified !== verified)) {
        const full = getRide(d.id); // with its track, so the update never drops it
        if (full) saveRide({ ...full, pointsEarned: num(r.pointsEarned), verified, pointsReason: r.pointsReason ?? null });
      }
      continue;
    }
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
      verified,
      pointsReason: r.pointsReason ?? null,
      synced: true,
      error: null,
    });
    added++;
  }
  return added;
}

/**
 * "Limpiar caché local": re-downloads ride history from the cloud. Refuses
 * while any ride is still unsynced, so nothing that exists only on this
 * device can be lost. Achievements are recomputed from the downloaded history.
 */
export async function resetLocalCache(userId: string): Promise<number> {
  await syncPendingRides(userId);
  if (unsyncedRides(userId).length > 0) {
    throw new Error("Hay recorridos sin sincronizar. Conéctate a internet e inténtalo de nuevo.");
  }
  wipeAllLocalData(userId);
  initDb();
  const added = await pullRemoteRides(userId);
  evaluateAchievements(computeRiderStats(listRides(userId)), new Set()).forEach((a) => unlockAchievement(userId, a.code));
  return added;
}

/**
 * Deletes a ride everywhere. Real accounts: the server removes it and takes
 * back its points (otherwise the next sync would just re-download it).
 */
export async function deleteRideEverywhere(ride: Ride, isRealAccount: boolean): Promise<void> {
  if (isRealAccount && isFirebaseConfigured && ride.synced) {
    await api("rides", "DELETE", { id: ride.id });
  }
  deleteRide(ride.id);
}
