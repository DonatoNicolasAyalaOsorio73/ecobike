import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyMissions } from "../missions.ts";
import type { Ride } from "../../types/ride.ts";

const NOW = new Date(2026, 9, 1, 18);
const ride = (h: number, km: number, min: number, pts: number, dayOffset = 0): Ride =>
  ({ id: `${h}`, userId: "u", startedAt: new Date(2026, 9, 1 + dayOffset, h).getTime(), distanceMeters: km * 1000, durationSeconds: min * 60, pointsEarned: pts } as Ride);

test("three missions, only today's rides count, progress capped at target", () => {
  const ms = dailyMissions([ride(7, 4, 15, 60), ride(17, 6, 25, 80), ride(8, 50, 120, 520, -1)], 100, NOW);
  assert.equal(ms.length, 3);
  const km = ms.find((m) => m.id === "km")!;
  assert.equal(km.current, Math.min(10, km.target));
  assert.equal(km.done, true);
  const pts = ms.find((m) => m.id === "pts")!;
  assert.equal(pts.target, 100);
  assert.equal(pts.done, true);
  assert.ok(ms.every((m) => m.current <= m.target));
});

test("no rides today → nothing done", () => {
  const ms = dailyMissions([ride(8, 30, 90, 300, -1)], 100, NOW);
  assert.ok(ms.every((m) => !m.done && m.current === 0));
});

test("missions rotate between days but are stable within a day", () => {
  const a = dailyMissions([], 100, new Date(2026, 9, 1, 8)).map((m) => m.title);
  const b = dailyMissions([], 100, new Date(2026, 9, 1, 22)).map((m) => m.title);
  assert.deepEqual(a, b);
  const days = new Set(Array.from({ length: 6 }, (_, i) => dailyMissions([], 100, new Date(2026, 9, 1 + i)).map((m) => m.title).join("|")));
  assert.ok(days.size > 1);
});
