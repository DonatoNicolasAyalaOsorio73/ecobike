import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeTrack, downsample, scoreRide, type TrackSample } from "../rideScore.ts";

// Same cases as api/_lib.test.mjs (the server runs identical rules).
const M_PER_DEG = 111194.93; // haversine metres per degree of latitude (R = 6371 km)
function line(kmh: number, km: number, dtS = 5, t0 = 1_800_000_000_000): TrackSample[] {
  const stepM = (kmh / 3.6) * dtS;
  const n = Math.round((km * 1000) / stepM);
  return Array.from({ length: n + 1 }, (_, i) => [4.6 + (i * stepM) / M_PER_DEG, -74.08, t0 + i * dtS * 1000] as TrackSample);
}
const score = (track: TrackSample[], claimedM: number, durS: number) => scoreRide(claimedM, durS, analyzeTrack(track));

test("a real 15 km bike ride at 18 km/h earns 5 pts/km + 5 bonus", () => {
  assert.deepEqual(score(line(18, 15), 15_000, 3000), { points: 80, reason: null });
});

test("walking earns nothing", () => {
  assert.match(score(line(5, 3), 3_000, 2160).reason ?? "", /bicicleta/);
  assert.equal(score(line(5, 3), 3_000, 2160).points, 0);
});

test("car or bus speeds earn nothing", () => {
  assert.equal(score(line(60, 15), 15_000, 900).points, 0);
});

test("GPS teleports (fake location) earn nothing", () => {
  const t = line(18, 5);
  const jumped = t.map((p, i) => (i > 20 ? ([p[0] + 0.02, p[1], p[2]] as TrackSample) : p)); // ~2.2 km jump in 5 s
  assert.match(score(jumped, 7_000, 1000).reason ?? "", /saltos/);
});

test("can't claim more distance than the track shows (10% tolerance)", () => {
  // Claims 15 km, the track shows ~5 km: credited = track × 1.1, never the claim.
  const credited = analyzeTrack(line(18, 5))!.distanceMeters * 1.1;
  assert.equal(score(line(18, 5), 15_000, 1000).points, Math.round((credited / 1000) * 5) + 5);
  assert.ok(score(line(18, 5), 15_000, 1000).points < 40);
});

test("no track or a too-short ride earns nothing", () => {
  assert.equal(scoreRide(15_000, 3000, null).points, 0);
  assert.equal(score(line(18, 0.4), 400, 80).points, 0);
});

test("short rides get no completion bonus (no bonus farming)", () => {
  assert.equal(score(line(18, 0.8), 800, 160).points, 4);
});

test("downsample keeps both ends and caps the length", () => {
  const pts = Array.from({ length: 5000 }, (_, i) => i);
  const d = downsample(pts, 800);
  assert.equal(d.length, 800);
  assert.equal(d[0], 0);
  assert.equal(d[799], 4999);
});
