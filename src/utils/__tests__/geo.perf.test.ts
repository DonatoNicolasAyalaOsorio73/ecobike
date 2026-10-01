import { test } from "node:test";
import assert from "node:assert/strict";
import { incrementalDistanceMeters, totalElevationGainMeters } from "../geo.ts";
import type { TrackPoint } from "@/types/ride";

// A GPS fix every second for 4 hours is a long real ride and a realistic
// upper bound for on-device track size (see rideStore.ts sampling).
const FOUR_HOUR_RIDE_POINTS = 4 * 60 * 60;

function buildTrack(n: number): TrackPoint[] {
  const points: TrackPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({
      lat: 4.71 + i * 0.00001,
      lng: -74.07 + i * 0.00001,
      altitude: 2600 + Math.sin(i / 50) * 20,
      timestamp: i * 1000,
      speed: null,
    });
  }
  return points;
}

test("speed: processing a 4-hour ride's track stays well under a frame-blocking budget", () => {
  const points = buildTrack(FOUR_HOUR_RIDE_POINTS);
  const start = performance.now();

  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += incrementalDistanceMeters(points[i - 1], points[i]);
  }
  totalElevationGainMeters(points);

  const elapsedMs = performance.now() - start;
  assert.ok(distance > 0);
  // Generous budget (this runs in a fraction of that on real hardware) —
  // this test exists to catch an accidental O(n^2) regression, not to
  // micro-benchmark exact timing.
  assert.ok(elapsedMs < 2000, `expected < 2000ms for ${FOUR_HOUR_RIDE_POINTS} points, got ${elapsedMs.toFixed(1)}ms`);
});
