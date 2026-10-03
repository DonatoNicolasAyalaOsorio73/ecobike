import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as client from "@/utils/rideScore";
import { isVerified } from "@/utils/verified";
import { weekKey } from "@/utils/week";

// The device and the server score rides with hand-copied rules (rideScore.ts
// and api/_lib.js). This keeps the two copies from drifting apart.
const server = createRequire(import.meta.url)("../../../api/_lib.js");

const M = 111194.93;
const t0 = 1_800_000_000_000;
function line(kmh: number, km: number, dtS = 5): client.TrackSample[] {
  const step = (kmh / 3.6) * dtS;
  return Array.from({ length: Math.round((km * 1000) / step) + 1 }, (_, i) => [4.6 + (i * step) / M, -74.08, t0 + i * dtS * 1000] as client.TrackSample);
}
const cases: [string, client.TrackSample[], number, number][] = [
  ["bike 18 km/h 10 km", line(18, 10), 10_000, 2000],
  ["walk 5 km/h", line(5, 2), 2000, 1440],
  ["car 60 km/h", line(60, 10), 10_000, 600],
  ["tiny", line(18, 0.3), 300, 60],
  ["overclaim", line(18, 3), 9000, 600],
  ["teleport", [...line(18, 2), [4.7, -74.0, t0 + 410_000] as client.TrackSample, [4.70001, -74.0, t0 + 415_000] as client.TrackSample], 2500, 600],
  ["duplicate fixes", (() => { const l = line(18, 3); return [...l.slice(0, 5), l[4], ...l.slice(5)]; })(), 3000, 600],
];

test("scoring: device and server give the same points and reason", () => {
  for (const [name, track, meters, secs] of cases) {
    const end = t0 + secs * 1000;
    const c = client.scoreRide(meters, secs, client.analyzeTrack(client.sanitizeTrack(track, t0, end)));
    const s = server.scoreRide(meters, secs, server.analyzeTrack(server.sanitizeTrack(track, t0, end)));
    assert.deepEqual(c, s, name);
  }
});

test("caps and constants: device and server agree", () => {
  assert.equal(client.DAILY_POINTS_CAP, server.DAILY_POINTS_CAP);
  assert.equal(client.MAX_RIDES_PER_DAY, server.MAX_RIDES_PER_DAY);
  const cases: [number, string | null, number, number][] = [[55, null, 0, 0], [55, null, 120, 3], [55, null, 0, 20], [0, "x", 0, 0]];
  for (const [p, r, e, n] of cases) assert.deepEqual(client.capRidePoints(p, r, e, n), server.capRidePoints(p, r, e, n));
});

test("verified: the server's flag wins; old rides fall back to points", () => {
  assert.equal(isVerified({ pointsEarned: 0, verified: true }), true); // capped to 0, still a real ride
  assert.equal(isVerified({ pointsEarned: 30, verified: false }), false); // server refused it
  assert.equal(isVerified({ pointsEarned: 30 }), true);
  assert.equal(isVerified({ pointsEarned: 0 }), false);
});

test("league weeks: device and server agree (Colombia time, ISO weeks)", () => {
  const start = Date.UTC(2026, 0, 1);
  for (let h = 0; h < 24 * 400; h += 7) {
    const ms = start + h * 3600_000;
    assert.equal(weekKey(ms), server.weekKey(ms), new Date(ms).toISOString());
  }
});
