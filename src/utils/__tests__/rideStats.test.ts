import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityHeatmap,
  distanceThisWeek,
  groupRidesByMonth,
  personalRecords,
  ridesInPeriod,
  startOfWeek,
} from "../rideStats.ts";
import { createEmptyRide } from "../../types/ride.ts";

function ride(overrides: { startedAt: number; distanceMeters?: number; durationSeconds?: number; avgSpeedKmh?: number; pointsEarned?: number }) {
  return { ...createEmptyRide("u1", `r${overrides.startedAt}`), ...overrides };
}

function at(year: number, month: number, day: number, hour = 12) {
  return new Date(year, month - 1, day, hour).getTime();
}

test("startOfWeek: Monday-based, and a Sunday belongs to the week that began the prior Monday", () => {
  // 2026-09-16 is a Wednesday; its week starts Monday 2026-09-14.
  assert.equal(startOfWeek(new Date(2026, 8, 16)).getTime(), new Date(2026, 8, 14).getTime());
  // 2026-09-20 is a Sunday — same week, not the start of a new one.
  assert.equal(startOfWeek(new Date(2026, 8, 20)).getTime(), new Date(2026, 8, 14).getTime());
  // The Monday itself is its own week start.
  assert.equal(startOfWeek(new Date(2026, 8, 14)).getTime(), new Date(2026, 8, 14).getTime());
});

test("ridesInPeriod: week excludes a ride from the previous Sunday", () => {
  const now = new Date(2026, 8, 16); // Wednesday
  const rides = [
    ride({ startedAt: at(2026, 9, 15), distanceMeters: 5000 }), // Tue, in week
    ride({ startedAt: at(2026, 9, 13), distanceMeters: 9000 }), // Sun, previous week
  ];
  const inWeek = ridesInPeriod(rides, "week", now);
  assert.equal(inWeek.length, 1);
  assert.equal(inWeek[0].distanceMeters, 5000);
});

test("ridesInPeriod: 'all' never filters anything out", () => {
  const rides = [ride({ startedAt: at(2019, 1, 1) }), ride({ startedAt: at(2026, 9, 16) })];
  assert.equal(ridesInPeriod(rides, "all", new Date(2026, 8, 16)).length, 2);
});

test("ridesInPeriod: month and year boundaries are calendar-based, not rolling windows", () => {
  const now = new Date(2026, 8, 16); // September 2026
  const rides = [
    ride({ startedAt: at(2026, 9, 1) }), // Sept 1 — in month
    ride({ startedAt: at(2026, 8, 31) }), // Aug 31 — in year, not month
    ride({ startedAt: at(2025, 12, 31) }), // previous year
  ];
  assert.equal(ridesInPeriod(rides, "month", now).length, 1);
  assert.equal(ridesInPeriod(rides, "year", now).length, 2);
});

test("distanceThisWeek: sums only the current week's rides", () => {
  const now = new Date(2026, 8, 16);
  const rides = [
    ride({ startedAt: at(2026, 9, 14), distanceMeters: 4000 }),
    ride({ startedAt: at(2026, 9, 16), distanceMeters: 6000 }),
    ride({ startedAt: at(2026, 9, 10), distanceMeters: 50_000 }), // prior week
  ];
  assert.equal(distanceThisWeek(rides, now), 10_000);
});

test("personalRecords: picks the max of each dimension independently", () => {
  const rides = [
    ride({ startedAt: at(2026, 9, 1), distanceMeters: 20_000, durationSeconds: 3600, avgSpeedKmh: 20, pointsEarned: 220 }),
    ride({ startedAt: at(2026, 9, 2), distanceMeters: 8000, durationSeconds: 7200, avgSpeedKmh: 4, pointsEarned: 100 }),
    ride({ startedAt: at(2026, 9, 3), distanceMeters: 5000, durationSeconds: 600, avgSpeedKmh: 30, pointsEarned: 70 }),
  ];
  const pr = personalRecords(rides);
  assert.equal(pr.longestRideMeters, 20_000);
  assert.equal(pr.longestDurationSeconds, 7200);
  assert.equal(pr.fastestAvgSpeedKmh, 30);
  assert.equal(pr.mostPointsInRide, 220);
});

test("personalRecords: a zero-duration ride can't win the speed record", () => {
  const rides = [
    ride({ startedAt: at(2026, 9, 1), durationSeconds: 0, avgSpeedKmh: 999 }),
    ride({ startedAt: at(2026, 9, 2), durationSeconds: 1800, avgSpeedKmh: 22 }),
  ];
  assert.equal(personalRecords(rides).fastestAvgSpeedKmh, 22);
});

test("personalRecords: bestDayMeters sums multiple rides on the same day", () => {
  const rides = [
    ride({ startedAt: at(2026, 9, 5, 8), distanceMeters: 7000 }),
    ride({ startedAt: at(2026, 9, 5, 19), distanceMeters: 6000 }),
    ride({ startedAt: at(2026, 9, 6, 9), distanceMeters: 12_000 }),
  ];
  assert.equal(personalRecords(rides).bestDayMeters, 13_000);
});

test("personalRecords: empty history is all zeroes, not -Infinity", () => {
  const pr = personalRecords([]);
  assert.equal(pr.longestRideMeters, 0);
  assert.equal(pr.bestDayMeters, 0);
  assert.equal(pr.fastestAvgSpeedKmh, 0);
});

test("activityHeatmap: returns exactly `days` cells, oldest first, ending today", () => {
  const now = new Date(2026, 8, 16);
  const cells = activityHeatmap([], 7, now);
  assert.equal(cells.length, 7);
  assert.equal(cells[6].date, new Date(2026, 8, 16).getTime());
  assert.equal(cells[0].date, new Date(2026, 8, 10).getTime());
});

test("activityHeatmap: levels are relative to the rider's own best day", () => {
  const now = new Date(2026, 8, 16);
  const rides = [
    ride({ startedAt: at(2026, 9, 16), distanceMeters: 40_000 }), // the max → level 4
    ride({ startedAt: at(2026, 9, 15), distanceMeters: 4000 }), // 10% → level 1
  ];
  const cells = activityHeatmap(rides, 7, now);
  const today = cells.find((c) => c.date === new Date(2026, 8, 16).getTime())!;
  const yesterday = cells.find((c) => c.date === new Date(2026, 8, 15).getTime())!;
  const idle = cells.find((c) => c.date === new Date(2026, 8, 14).getTime())!;
  assert.equal(today.level, 4);
  assert.equal(yesterday.level, 1);
  assert.equal(idle.level, 0);
});

test("activityHeatmap: no rides means every cell is level 0", () => {
  const cells = activityHeatmap([], 14, new Date(2026, 8, 16));
  assert.ok(cells.every((c) => c.level === 0 && c.meters === 0));
});

test("groupRidesByMonth: newest month first, rides newest-first within it", () => {
  const rides = [
    ride({ startedAt: at(2026, 8, 20) }),
    ride({ startedAt: at(2026, 9, 2) }),
    ride({ startedAt: at(2026, 9, 16) }),
  ];
  const groups = groupRidesByMonth(rides);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, "2026-09");
  assert.equal(groups[0].rides.length, 2);
  assert.equal(groups[0].rides[0].startedAt, at(2026, 9, 16));
  assert.equal(groups[1].key, "2026-08");
});
