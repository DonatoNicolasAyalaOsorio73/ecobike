import { test } from "node:test";
import assert from "node:assert/strict";
import { longestStreak, pointsToday, streakMessage, weekStreakDots } from "../streak.ts";
import type { Ride } from "../../types/ride.ts";

const NOW = new Date(2026, 8, 30, 12); // Wednesday
const ride = (dayOffset: number, pts = 10): Ride =>
  ({ id: String(dayOffset), userId: "u", startedAt: new Date(2026, 8, 30 + dayOffset, 8).getTime(), pointsEarned: pts } as Ride);

test("weekStreakDots marks done, missed, today and future", () => {
  const dots = weekStreakDots([ride(-2), ride(0)], NOW); // Mon and Wed
  assert.deepEqual(dots.map((d) => d.status), ["done", "missed", "done", "future", "future", "future", "future"]);
  assert.equal(weekStreakDots([ride(-2)], NOW)[2].status, "today");
});

test("longestStreak counts consecutive days, ignoring multiple rides per day", () => {
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak([ride(-5), ride(-4), ride(-4), ride(-3), ride(-1), ride(0)]), 3);
});

test("pointsToday sums only today's rides", () => {
  assert.equal(pointsToday([ride(0, 30), ride(0, 20), ride(-1, 99)], NOW), 50);
});

test("streakMessage covers the main states", () => {
  assert.match(streakMessage(0, false), /empezar/);
  assert.match(streakMessage(3, false), /mantener/);
  assert.match(streakMessage(7, true), /semana/);
});
