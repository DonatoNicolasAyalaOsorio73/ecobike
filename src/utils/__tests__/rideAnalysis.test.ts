import { test } from "node:test";
import assert from "node:assert/strict";
import { kmSplits, rideProfile } from "../rideAnalysis.ts";
import type { TrackPoint } from "../../types/ride.ts";

// Straight line north: 0.001° lat ≈ 111 m. One point every ~111 m.
function line(n: number, msPerPoint: number, altStep = 0): TrackPoint[] {
  return Array.from({ length: n }, (_, i) => ({ lat: 4.6 + i * 0.001, lng: -74.08, altitude: 2600 + i * altStep, timestamp: i * msPerPoint, speed: null }));
}

test("kmSplits: one split per full km, with a final partial and the fastest marked", () => {
  const pts = line(30, 20_000); // ~3.2 km, 20 s per ~111 m → ~180 s/km
  const s = kmSplits(pts);
  assert.equal(s.filter((x) => Number.isInteger(x.km)).length, 3);
  assert.ok(s.every((x) => x.seconds > 0));
  assert.ok(Math.abs(s[0].seconds - 180) < 10, `got ${s[0].seconds}`);
  assert.equal(s.filter((x) => x.fastest).length, 1);
  assert.deepEqual(kmSplits([]), []);
});

test("rideProfile: constant speed and rising altitude", () => {
  const pts = line(60, 20_000, 2); // ~20 km/h
  const p = rideProfile(pts, 10);
  assert.equal(p.speed.length, 10);
  assert.ok(p.speed.every((v) => v > 15 && v < 25), JSON.stringify(p.speed));
  // Constant speed must give a flat line (no sawtooth from uneven fixes per slice).
  const spread = Math.max(...p.speed) - Math.min(...p.speed);
  assert.ok(spread < 0.5, `spread ${spread}`);
  const uneven = rideProfile(line(60, 20_000), 37).speed;
  assert.ok(Math.max(...uneven) - Math.min(...uneven) < 0.5);
  assert.ok(p.altitude[9] > p.altitude[0]);
  assert.deepEqual(rideProfile([pts[0]]), { speed: [], altitude: [] });
});
