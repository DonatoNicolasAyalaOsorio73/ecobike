import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { capRidePoints, redeemLimitError, analyzeTrack } = createRequire(import.meta.url)("./_lib.js");

test("daily cap: 150 pts per rolling 24 h, never negative, validator reason wins", () => {
  assert.deepEqual(capRidePoints(55, null, 0, 0), { points: 55, reason: null });
  assert.deepEqual(capRidePoints(55, null, 120, 3), { points: 30, reason: "Límite diario de 150 puntos alcanzado." });
  assert.deepEqual(capRidePoints(55, null, 150, 3), { points: 0, reason: "Límite diario de 150 puntos alcanzado." });
  assert.equal(capRidePoints(55, null, 400, 3).points, 0); // never negative
  assert.deepEqual(capRidePoints(55, null, 0, 20), { points: 0, reason: "Límite diario de recorridos alcanzado." });
  assert.deepEqual(capRidePoints(0, "No parece un recorrido en bicicleta.", 0, 0), { points: 0, reason: "No parece un recorrido en bicicleta." });
});

const DAY = 86_400_000;
const now = 1_800_000_000_000;
const code = (rewardId, agoMs) => ({ rewardId, createdAt: now - agoMs });

test("redeem limits: 3 verified rides first, 1 per 24 h, same store every 7 days", () => {
  assert.equal(redeemLimitError(2, [], "s1", now)?.status, 403);
  assert.equal(redeemLimitError(3, [], "s1", now), null);
  assert.equal(redeemLimitError(3, [code("s2", 2 * 3600_000)], "s1", now)?.status, 429); // any store, within 24 h
  assert.equal(redeemLimitError(3, [code("s2", DAY + 60_000)], "s1", now), null); // other store after 24 h
  assert.equal(redeemLimitError(3, [code("s1", 3 * DAY)], "s1", now)?.status, 429); // same store within 7 days
  assert.equal(redeemLimitError(3, [code("s1", 7 * DAY + 60_000)], "s1", now), null); // same store after 7 days
  // Firestore Timestamps work too.
  assert.equal(redeemLimitError(3, [{ rewardId: "s1", createdAt: { toMillis: () => now - 3600_000 } }], "s9", now)?.status, 429);
});

test("track: a duplicated or out-of-order fix is skipped, not fatal", () => {
  const t0 = now;
  const pts = Array.from({ length: 50 }, (_, i) => [4.6 + (i * 25) / 111194.93, -74.08, t0 + i * 5000]); // 18 km/h
  const clean = analyzeTrack(pts);
  const withDup = analyzeTrack([...pts.slice(0, 10), pts[9], [pts[8][0], pts[8][1], pts[8][2]], ...pts.slice(10)]);
  assert.ok(withDup);
  assert.ok(Math.abs(withDup.distanceMeters - clean.distanceMeters) < 30);
  assert.equal(withDup.teleportMeters, 0);
});
