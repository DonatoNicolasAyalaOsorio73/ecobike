import { test } from "node:test";
import assert from "node:assert/strict";
import { RIDE_GOAL_OPTIONS, goalLabel, goalProgress } from "../rideGoals.ts";

test("goalProgress for distance and time goals, clamped to [0,1]", () => {
  assert.equal(goalProgress({ kind: "distance", meters: 10_000 }, { distanceMeters: 2500, durationSeconds: 0 }), 0.25);
  assert.equal(goalProgress({ kind: "time", seconds: 1800 }, { distanceMeters: 0, durationSeconds: 900 }), 0.5);
  assert.equal(goalProgress({ kind: "distance", meters: 5000 }, { distanceMeters: 9000, durationSeconds: 0 }), 1);
});

test("goal labels and options are well formed", () => {
  assert.equal(goalLabel({ kind: "distance", meters: 5000 }), "5 km");
  assert.equal(goalLabel({ kind: "time", seconds: 1800 }), "30 min");
  assert.equal(goalLabel({ kind: "time", seconds: 3600 }), "1 h");
  assert.equal(new Set(RIDE_GOAL_OPTIONS.map((o) => o.id)).size, RIDE_GOAL_OPTIONS.length);
  assert.equal(RIDE_GOAL_OPTIONS[0].goal, null);
});
