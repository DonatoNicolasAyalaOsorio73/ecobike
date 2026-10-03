import { test } from "node:test";
import assert from "node:assert/strict";
import {
  distanceBuckets,
  environmentalImpact,
  hourDistribution,
  periodComparison,
  trendSeries,
  weekdayDistribution,
} from "../rideStats.ts";
import { DEMO_RIDE_PREFIX, generateDemoRides, seededRandom } from "../../utils/demoData.ts";
import { ACHIEVEMENTS } from "../../types/achievement.ts";
import { evaluateAchievements } from "../gamification.ts";
import type { Ride } from "../../types/ride.ts";

// Wednesday 2026-09-30 12:00 local
const NOW = new Date(2026, 8, 30, 12, 0, 0);

function ride(dayOffset: number, km: number, hour = 8, points = 0): Ride {
  const d = new Date(2026, 8, 30 + dayOffset, hour, 0, 0);
  return {
    id: `r${dayOffset}_${hour}`,
    userId: "u",
    startedAt: d.getTime(),
    endedAt: d.getTime() + 3600_000,
    distanceMeters: km * 1000,
    durationSeconds: 3600,
    avgSpeedKmh: km,
    maxSpeedKmh: km,
    elevationGainMeters: 0,
    caloriesKcal: 0,
    points: [],
    pointsEarned: points,
    synced: true,
    error: null,
  };
}

test("trendSeries week: buckets by weekday starting Monday", () => {
  const s = trendSeries([ride(0, 10), ride(-2, 5)], "week", NOW); // Wed and Mon
  assert.deepEqual(s.labels, ["L", "M", "X", "J", "V", "S", "D"]);
  assert.equal(s.values[0], 5);
  assert.equal(s.values[2], 10);
});

test("trendSeries month has one bucket per day; year has 12", () => {
  assert.equal(trendSeries([], "month", NOW).values.length, 30);
  const y = trendSeries([ride(0, 7)], "year", NOW);
  assert.equal(y.values.length, 12);
  assert.equal(y.values[8], 7); // September
});

test("periodComparison: % change vs previous week, null without baseline", () => {
  const rides = [ride(0, 20), ride(-7, 10)]; // this Wed, last Wed
  const c = periodComparison(rides, "week", NOW);
  assert.equal(c.current.distanceMeters, 20_000);
  assert.equal(c.previous?.distanceMeters, 10_000);
  assert.equal(c.change?.distance, 100);
  assert.equal(periodComparison([ride(0, 5)], "week", NOW).change?.distance, null);
  assert.equal(periodComparison(rides, "all", NOW).change, null);
});

test("weekday, hour and distance distributions", () => {
  const rides = [ride(0, 3, 7), ride(-1, 10, 18), ride(-2, 30, 7)];
  assert.equal(weekdayDistribution(rides).values[2], 3); // Wednesday
  assert.equal(hourDistribution(rides).values[2], 2); // 6-9h
  assert.deepEqual(distanceBuckets(rides), { short: 1, medium: 1, long: 1 });
});

test("environmentalImpact scales with distance", () => {
  const i = environmentalImpact(100_000);
  assert.ok(Math.abs(i.co2Kg - 12) < 1e-9);
  assert.ok(i.fuelLiters > 0 && i.treesYear > 0);
});

test("demo data is deterministic, realistic and plausible for the server", () => {
  const a = generateDemoRides("guest_x", NOW);
  const b = generateDemoRides("guest_x", NOW);
  assert.deepEqual(a.map((r) => r.id), b.map((r) => r.id));
  assert.ok(a.length > 80, `expected a rich history, got ${a.length}`);
  for (const r of a) {
    assert.ok(r.id.startsWith(DEMO_RIDE_PREFIX));
    assert.ok(r.startedAt < NOW.getTime());
    assert.ok(r.avgSpeedKmh < 45, "server rejects car speeds");
    assert.ok(r.points.length > 10);
    assert.ok(r.pointsEarned > 0);
  }
  const startOfToday = new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()).getTime();
  assert.ok(a.some((x) => x.startedAt >= startOfToday), "demo always has a ride today");
  const r = seededRandom(1)();
  assert.ok(r >= 0 && r < 1);
});

test("every achievement has progress in [0,1] and demo history unlocks several", () => {
  const rides = generateDemoRides("guest_x", NOW);
  const stats = {
    totalRides: rides.length,
    totalDistanceMeters: rides.reduce((s, x) => s + x.distanceMeters, 0),
    totalDurationSeconds: 0,
    bestRide: rides.reduce((m, x) => (x.distanceMeters > m.distanceMeters ? x : m)),
    currentStreakDays: 0,
    bestStreakDays: 0,
    totalPoints: rides.reduce((s, x) => s + x.pointsEarned, 0),
  };
  for (const a of ACHIEVEMENTS) {
    const p = a.progress(stats);
    assert.ok(p >= 0 && p <= 1, a.code);
  }
  assert.ok(evaluateAchievements(stats, new Set()).length >= 5);
});
