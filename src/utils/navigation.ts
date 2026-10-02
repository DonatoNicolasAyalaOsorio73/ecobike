import { haversineMeters } from "@/utils/geo";

/** One turn instruction on a planned route (from Valhalla's maneuvers). */
export interface Maneuver {
  instruction: string;
  /** Valhalla maneuver type (turn direction, roundabout, destination…). */
  type: number;
  /** Index into the route's points where this maneuver starts. */
  beginIndex: number;
}

export interface NavState {
  /** The next instruction ahead of the rider (null once past the last one). */
  next: Maneuver | null;
  /** Metres along the route to that instruction. */
  distanceM: number;
  /** Metres left to the destination along the route. */
  remainingM: number;
  /** Farther than OFF_ROUTE_M from the route line. */
  offRoute: boolean;
  arrived: boolean;
}

export const OFF_ROUTE_M = 50;
const ARRIVED_M = 30;

/** Cumulative distance (m) at each route point; precompute once per route. */
export function cumulativeMeters(points: { lat: number; lng: number }[]): number[] {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + haversineMeters(points[i - 1], points[i]));
  return cum;
}

/** Index of the route point closest to `pos`, and how far it is. */
export function nearestPoint(points: { lat: number; lng: number }[], pos: { lat: number; lng: number }) {
  let index = 0;
  let distanceM = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = haversineMeters(points[i], pos);
    if (d < distanceM) {
      distanceM = d;
      index = i;
    }
  }
  return { index, distanceM };
}

/**
 * Where the rider is on a planned route: the next turn ahead and the
 * distance to it, measured along the route (not as the crow flies).
 * ponytail: linear nearest-point scan (routes are ≤ a few thousand points,
 * one check per GPS fix); use a spatial index if routes get much longer.
 */
export function navigate(points: { lat: number; lng: number }[], cum: number[], maneuvers: Maneuver[], pos: { lat: number; lng: number }): NavState {
  const { index, distanceM: fromLine } = nearestPoint(points, pos);
  const total = cum[cum.length - 1] ?? 0;
  const remainingM = Math.max(0, total - (cum[index] ?? 0));
  const endDistance = points.length ? haversineMeters(points[points.length - 1], pos) : Infinity;
  const next = maneuvers.find((m) => m.beginIndex > index) ?? null;
  return {
    next,
    distanceM: next ? Math.max(0, cum[next.beginIndex] - cum[index]) : remainingM,
    remainingM,
    offRoute: fromLine > OFF_ROUTE_M,
    arrived: endDistance <= ARRIVED_M,
  };
}

/** "En 200 m" / "En 1,2 km", rounded the way navigation apps speak. */
export function distanceLabel(m: number): string {
  if (m < 30) return "Ahora";
  if (m < 1000) return `En ${Math.round(m / 10) * 10} m`;
  return `En ${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

/** Ionicons glyph for a Valhalla maneuver type. */
export function maneuverIcon(type: number): string {
  if ([4, 5, 6].includes(type)) return "flag";
  if ([9, 10, 11, 2, 20].includes(type)) return "return-up-forward";
  if ([14, 15, 16, 3, 21].includes(type)) return "return-up-back";
  if ([12, 13].includes(type)) return "arrow-undo";
  if ([26, 27].includes(type)) return "sync";
  return "arrow-up";
}
