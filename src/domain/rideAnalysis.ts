import type { TrackPoint } from "@/types/ride";
import { incrementalDistanceMeters } from "@/utils/geo";

/** Cumulative distance (m) at each track point. */
function cumulative(points: TrackPoint[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + incrementalDistanceMeters(points[i - 1], points[i]));
  return out;
}

/** Linear interpolation of time and altitude at distance `d` along the track. */
function at(points: TrackPoint[], dist: number[], d: number): { t: number; alt: number } {
  let i = 1;
  while (i < dist.length - 1 && dist[i] < d) i++;
  const span = Math.max(1e-6, dist[i] - dist[i - 1]);
  const f = Math.max(0, Math.min(1, (d - dist[i - 1]) / span));
  const p = points[i - 1];
  const q = points[i];
  return { t: p.timestamp + f * (q.timestamp - p.timestamp), alt: (p.altitude ?? 0) + f * ((q.altitude ?? 0) - (p.altitude ?? 0)) };
}

/**
 * Speed (km/h) and altitude (m) resampled into `buckets` equal-distance
 * slices, ready to chart. Times at slice boundaries are interpolated, so
 * speed is smooth regardless of how many GPS fixes fall in each slice.
 */
export function rideProfile(points: TrackPoint[], buckets = 40): { speed: number[]; altitude: number[] } {
  if (points.length < 2) return { speed: [], altitude: [] };
  const dist = cumulative(points);
  const total = dist[dist.length - 1];
  if (total <= 0) return { speed: [], altitude: [] };
  const step = total / buckets;
  const speed: number[] = [];
  const altitude: number[] = [];
  let prev = at(points, dist, 0);
  for (let b = 1; b <= buckets; b++) {
    const cur = at(points, dist, b * step);
    const hours = (cur.t - prev.t) / 3_600_000;
    speed.push(hours > 0 ? Math.max(0, Math.min(80, step / 1000 / hours)) : 0);
    altitude.push(at(points, dist, (b - 0.5) * step).alt);
    prev = cur;
  }
  return { speed, altitude };
}

export interface Split {
  km: number;
  seconds: number;
  /** true for the fastest complete kilometre */
  fastest: boolean;
}

/** Time for each full kilometre (plus the final partial one), like Strava splits. */
export function kmSplits(points: TrackPoint[]): Split[] {
  if (points.length < 2) return [];
  const dist = cumulative(points);
  const splits: Split[] = [];
  let mark = 1000;
  let lastT = points[0].timestamp;
  for (let i = 1; i < points.length; i++) {
    while (dist[i] >= mark) {
      // interpolate the moment we crossed this km mark
      const f = (mark - dist[i - 1]) / Math.max(1e-6, dist[i] - dist[i - 1]);
      const t = points[i - 1].timestamp + f * (points[i].timestamp - points[i - 1].timestamp);
      splits.push({ km: mark / 1000, seconds: Math.round((t - lastT) / 1000), fastest: false });
      lastT = t;
      mark += 1000;
    }
  }
  const rest = dist[dist.length - 1] - (mark - 1000);
  if (rest > 100) splits.push({ km: Math.round(dist[dist.length - 1] / 100) / 10, seconds: Math.round((points[points.length - 1].timestamp - lastT) / 1000), fastest: false });
  const full = splits.filter((s) => Number.isInteger(s.km));
  if (full.length) {
    const best = full.reduce((m, s) => (s.seconds < m.seconds ? s : m));
    best.fastest = true;
  }
  return splits;
}
