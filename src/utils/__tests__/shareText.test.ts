import { test } from "node:test";
import assert from "node:assert/strict";
import { rideShareText } from "../shareText.ts";

test("rideShareText includes distance, time, points and CO2", () => {
  const t = rideShareText({ distanceMeters: 12_400, durationSeconds: 2700, pointsEarned: 144 }, "metric");
  assert.match(t, /12[.,]4/);
  assert.match(t, /144 puntos/);
  assert.match(t, /CO₂/);
  assert.match(t, /https:\/\//);
});
