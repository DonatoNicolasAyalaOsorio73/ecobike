import { test } from "node:test";
import assert from "node:assert/strict";
import { goalLabel, goalProgress } from "../rideGoals.ts";

test("goalProgress for distance and time goals, clamped to [0,1]", () => {
  assert.equal(goalProgress({ kind: "distance", meters: 10_000 }, { distanceMeters: 2500, durationSeconds: 0 }), 0.25);
  assert.equal(goalProgress({ kind: "time", seconds: 1800 }, { distanceMeters: 0, durationSeconds: 900 }), 0.5);
  assert.equal(goalProgress({ kind: "distance", meters: 5000 }, { distanceMeters: 9000, durationSeconds: 0 }), 1);
});

test("goal labels read naturally for custom training goals", () => {
  assert.equal(goalLabel({ kind: "distance", meters: 5000 }), "5 km");
  assert.equal(goalLabel({ kind: "time", seconds: 1800 }), "30 min");
  assert.equal(goalLabel({ kind: "time", seconds: 3600 }), "1 h");
  assert.equal(goalLabel({ kind: "distance", meters: 42_000 }), "42 km");
  assert.equal(goalLabel({ kind: "time", seconds: 45 * 60 }), "45 min");
});
