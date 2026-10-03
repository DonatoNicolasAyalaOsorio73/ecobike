/**
 * Ride scoring and bicycle detection. KEEP IDENTICAL to analyzeTrack /
 * scoreRide in api/_lib.js: the server is the authority (it re-runs this on
 * the uploaded track and awards the real points); the app runs the same
 * rules so the number it shows at the finish matches what the server gives.
 * Both are tested with the same cases (rideScore.test.ts, api/_lib.test.mjs).
 */

export const POINTS_PER_KM = 5;
export const RIDE_BONUS = 5; // only for a real ride: ≥ BONUS_MIN_M and ≥ BONUS_MIN_S
export const BONUS_MIN_M = 1000;
export const BONUS_MIN_S = 300;
export const MIN_DISTANCE_M = 500;
export const DAILY_POINTS_CAP = 150; // enforced on the server (rolling 24 h)
export const MAX_RIDES_PER_DAY = 20;
const MOVING_KMH = 3; // below this the rider is stopped (GPS jitter)
const BIKE_MIN_KMH = 7; // walking is ~4-6 km/h
const BIKE_MAX_KMH = 50; // sustained faster than this is a vehicle
const TELEPORT_KMH = 80; // a jump this fast between two fixes is fake/broken GPS
const MIN_BIKE_SHARE = 0.6; // share of moving time that must be at bike speed
const MAX_TELEPORT_M = 200;
export const MAX_TRACK_POINTS = 800;

/** [lat, lng, timestampMs] */
export type TrackSample = [number, number, number];

export interface TrackAnalysis {
  distanceMeters: number;
  movingSeconds: number;
  bikeShare: number;
  teleportMeters: number;
}

function haversine(a: TrackSample, b: TrackSample): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Evenly thins a track to at most `max` samples, always keeping both ends. */
export function downsample<T>(points: T[], max = MAX_TRACK_POINTS): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]);
}

/** Re-measures a track and classifies how it was travelled. Null if it isn't a usable track. */
export function analyzeTrack(track: TrackSample[] | null): TrackAnalysis | null {
  if (!Array.isArray(track) || track.length < 2) return null;
  let distanceMeters = 0;
  let movingSeconds = 0;
  let bikeSeconds = 0;
  let teleportMeters = 0;
  // Duplicate or out-of-order fixes (batched background delivery) are skipped
  // against the last good fix instead of voiding the whole ride.
  let a = track[0];
  for (let i = 1; i < track.length; i++) {
    const b = track[i];
    const dt = (b[2] - a[2]) / 1000;
    if (!(dt > 0)) continue;
    const d = haversine(a, b);
    const kmh = (d / dt) * 3.6;
    a = b;
    if (kmh > TELEPORT_KMH) {
      teleportMeters += d;
      continue;
    }
    distanceMeters += d;
    if (kmh >= MOVING_KMH) {
      movingSeconds += dt;
      if (kmh >= BIKE_MIN_KMH && kmh <= BIKE_MAX_KMH) bikeSeconds += dt;
    }
  }
  return { distanceMeters, movingSeconds, bikeShare: movingSeconds > 0 ? bikeSeconds / movingSeconds : 0, teleportMeters };
}

export interface RideScore {
  points: number;
  /** Why a ride earned nothing (shown to the rider); null when it scored. */
  reason: string | null;
}

/** Points for a ride from its claimed summary and its track analysis. */
export function scoreRide(claimedMeters: number, durationSeconds: number, analysis: TrackAnalysis | null): RideScore {
  if (!analysis) return { points: 0, reason: "Sin ruta GPS verificable." };
  if (analysis.teleportMeters > MAX_TELEPORT_M) return { points: 0, reason: "Detectamos saltos de GPS imposibles en bicicleta." };
  // Never credit more than the track itself shows (10% GPS tolerance).
  const credited = Math.min(claimedMeters, analysis.distanceMeters * 1.1);
  if (credited < MIN_DISTANCE_M) return { points: 0, reason: "Recorrido muy corto (mínimo 500 m)." };
  if (analysis.bikeShare < MIN_BIKE_SHARE) return { points: 0, reason: "No parece un recorrido en bicicleta (velocidad de caminata o de vehículo)." };
  const bonus = credited >= BONUS_MIN_M && durationSeconds >= BONUS_MIN_S ? RIDE_BONUS : 0;
  return { points: Math.round((credited / 1000) * POINTS_PER_KM) + bonus, reason: null };
}

/** Keeps only well-formed fixes inside the ride window (±2 min), like the server. */
export function sanitizeTrack(track: TrackSample[], startedAt: number, endedAt: number): TrackSample[] | null {
  if (!Array.isArray(track) || track.length < 2 || track.length > MAX_TRACK_POINTS) return null;
  for (const p of track) {
    if (!Array.isArray(p) || p.length !== 3 || !p.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    if (Math.abs(p[0]) > 90 || Math.abs(p[1]) > 180) return null;
  }
  const inWindow = track.filter((p) => p[2] >= startedAt - 120_000 && p[2] <= endedAt + 120_000);
  return inWindow.length >= 2 ? inWindow : null;
}

/** Daily caps on a scored ride, identical to the server's capRidePoints (api/_lib.js). */
export function capRidePoints(ridePoints: number, rideReason: string | null, earnedToday: number, ridesToday: number): RideScore {
  const rideCapHit = ridesToday >= MAX_RIDES_PER_DAY;
  const points = rideCapHit ? 0 : Math.max(0, Math.min(ridePoints, DAILY_POINTS_CAP - earnedToday));
  const reason = rideReason ?? (rideCapHit ? "Límite diario de recorridos alcanzado." : points < ridePoints ? `Límite diario de ${DAILY_POINTS_CAP} puntos alcanzado.` : null);
  return { points, reason };
}
