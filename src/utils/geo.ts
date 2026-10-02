import type { TrackPoint } from "@/types/ride";

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance between two points, in meters (haversine). */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Distance a single GPS fix adds to a track. Drops jumps that are almost
 * certainly noise (a "teleport" faster than ~120 km/h between two fixes),
 * which otherwise inflate distance when GPS briefly loses lock indoors/under
 * bridges and then reacquires far away.
 */
export function incrementalDistanceMeters(prev: TrackPoint, next: TrackPoint): number {
  const meters = haversineMeters(prev, next);
  const seconds = (next.timestamp - prev.timestamp) / 1000;
  if (seconds <= 0) return 0;
  const impliedKmh = (meters / seconds) * 3.6;
  if (impliedKmh > 120) return 0;
  return meters;
}

export function totalElevationGainMeters(points: TrackPoint[]): number {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].altitude;
    const next = points[i].altitude;
    if (prev == null || next == null) continue;
    const delta = next - prev;
    if (delta > 0) gain += delta;
  }
  return gain;
}

export function avgSpeedKmh(distanceMeters: number, durationSeconds: number): number {
  if (durationSeconds <= 0) return 0;
  return (distanceMeters / durationSeconds) * 3.6;
}

/** Rough calorie estimate from distance + rider weight (defaults to 70kg). */
export function estimateCalories(distanceMeters: number, weightKg = 70): number {
  const MET = 6; // moderate cycling
  const km = distanceMeters / 1000;
  const hours = km / 16; // assumed ~16km/h if duration unknown
  return Math.round(MET * weightKg * hours);
}

export function metersToDisplay(meters: number, units: "metric" | "imperial") {
  if (units === "imperial") {
    const miles = meters / 1609.344;
    return { value: miles, unit: "mi" };
  }
  return { value: meters / 1000, unit: "km" };
}

export function kmhToDisplay(kmh: number, units: "metric" | "imperial") {
  if (units === "imperial") {
    return { value: kmh * 0.621371, unit: "mph" };
  }
  return { value: kmh, unit: "km/h" };
}

/** Initial bearing from a to b in degrees (0 = north, clockwise). */
export function bearingDegrees(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
