import { test } from "node:test";
import assert from "node:assert/strict";
import { computeStreakDays, levelForPoints, pointsForRide } from "../gamification.ts";
import { createEmptyRide } from "../../types/ride.ts";

test("pointsForRide: scores the ride's own GPS track (5 pts/km + bonus)", () => {
  // 10 km due north at 20 km/h, one fix every 5 s.
  const t0 = 1_800_000_000_000;
  const stepM = (20 / 3.6) * 5;
  const points = Array.from({ length: Math.round(10_000 / stepM) + 1 }, (_, i) => ({ lat: 4.6 + (i * stepM) / 111194.93, lng: -74.08, altitude: null, timestamp: t0 + i * 5000, speed: null }));
  const ride = { ...createEmptyRide("u1", "r1"), distanceMeters: 10_000, durationSeconds: 1800, points };
  assert.equal(pointsForRide(ride), 10 * 5 + 5);
});

test("pointsForRide: a ride without a GPS track earns nothing", () => {
  assert.equal(pointsForRide({ ...createEmptyRide("u1", "r1"), distanceMeters: 10_000, durationSeconds: 1800 }), 0);
});

test("levelForPoints: 0 points is level 1, climbs with thresholds", () => {
  assert.equal(levelForPoints(0).level, 1);
  assert.equal(levelForPoints(99).level, 1);
  assert.equal(levelForPoints(100).level, 2);
  assert.equal(levelForPoints(12000).level, 8);
});

test("computeStreakDays: no rides is zero streak", () => {
  assert.equal(computeStreakDays([]), 0);
});

test("computeStreakDays: consecutive days including today count fully", () => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  assert.equal(computeStreakDays([today, yesterday, twoDaysAgo]), 3);
});

test("computeStreakDays: a gap yesterday breaks the streak at today only", () => {
  const today = new Date();
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(today.getDate() - 3);
  assert.equal(computeStreakDays([today, threeDaysAgo]), 1);
});

test("computeStreakDays: missing today doesn't reset a streak still active as of yesterday", () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  assert.equal(computeStreakDays([yesterday, twoDaysAgo]), 2);
});
