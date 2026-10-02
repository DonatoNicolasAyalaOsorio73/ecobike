import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRiderStats, computeStreakDays, evaluateAchievements, levelForPoints, pointsForRide, streakDays, validAchievements } from "../gamification.ts";
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

const r = (day: number, km: number, pts: number) =>
  ({ ...createEmptyRide("u1", `r${day}-${km}`), startedAt: new Date(2026, 9, day, 8).getTime(), distanceMeters: km * 1000, durationSeconds: 1800, pointsEarned: pts });

test("strict: achievements can't be completed with rides that earned no points", () => {
  const walksAndCars = [r(1, 50, 0), r(2, 120, 0), r(3, 5, 0)];
  assert.equal(computeRiderStats(walksAndCars).totalRides, 0);
  assert.deepEqual(evaluateAchievements(computeRiderStats(walksAndCars), new Set()), []);
});

test("verified rides unlock achievements as usual", () => {
  const codes = evaluateAchievements(computeRiderStats([r(1, 12, 65)]), new Set()).map((a) => a.code);
  assert.ok(codes.includes("first_ride") && codes.includes("10km_club"));
});

test("validAchievements drops unlocks the verified history doesn't support, keeps legit ones", () => {
  const stats = computeRiderStats([r(1, 12, 65), r(2, 0.3, 0)]);
  const kept = validAchievements(new Set(["first_ride", "10km_club", "100km_club", "century_ride"]), stats);
  assert.deepEqual([...kept].sort(), ["10km_club", "first_ride"]);
});

test("streak counts verified rides only; an earned streak achievement stays earned", () => {
  const verified = [r(1, 5, 30), r(2, 5, 30), r(3, 5, 30)];
  assert.equal(computeRiderStats(verified).bestStreakDays, 3);
  assert.ok(validAchievements(new Set(["streak_3"]), computeRiderStats(verified)).has("streak_3"));
  assert.equal(streakDays([r(1, 5, 0)]), 0);
});
