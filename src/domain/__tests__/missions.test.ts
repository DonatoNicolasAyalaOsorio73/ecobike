import { test } from "node:test";
import assert from "node:assert/strict";
import { dailyMissions, renewsIn } from "../missions.ts";
import type { Ride } from "../../types/ride.ts";

const NOW = new Date(2026, 9, 1, 18);
const ride = (h: number, km: number, min: number, pts: number, dayOffset = 0): Ride =>
  ({ id: `${h}-${dayOffset}`, userId: "u", startedAt: new Date(2026, 9, 1 + dayOffset, h).getTime(), distanceMeters: km * 1000, durationSeconds: min * 60, avgSpeedKmh: km / (min / 60), elevationGainMeters: 50, pointsEarned: pts } as Ride);

test("three different missions, progress capped at target", () => {
  const ms = dailyMissions([ride(7, 20, 70, 105), ride(17, 15, 50, 80)], 100, NOW, "u1");
  assert.equal(ms.length, 3);
  assert.equal(new Set(ms.map((m) => m.id)).size, 3);
  assert.ok(ms.every((m) => m.current <= m.target));
});

test("strict: rides that earned no points (walks, car, fake GPS) never count", () => {
  const unverified = [ride(7, 40, 120, 0), ride(9, 30, 90, 0)];
  for (let d = 0; d < 20; d++) {
    const ms = dailyMissions(unverified.map((r) => ({ ...r, startedAt: r.startedAt + d * 86_400_000 })), 100, new Date(NOW.getTime() + d * 86_400_000), "u1");
    assert.ok(ms.every((m) => m.current === 0 && !m.done), `day ${d}`);
  }
});

test("yesterday's rides don't count today", () => {
  const ms = dailyMissions([ride(8, 30, 90, 150, -1)], 100, NOW, "u1");
  assert.ok(ms.every((m) => !m.done && m.current === 0));
});

test("random but stable: same all day for a user, new set on other days and for other users", () => {
  const titles = (d: Date, u: string) => dailyMissions([], 100, d, u).map((m) => m.title).join("|");
  assert.equal(titles(new Date(2026, 9, 1, 0, 5), "u1"), titles(new Date(2026, 9, 1, 23, 55), "u1"));
  const days = new Set(Array.from({ length: 10 }, (_, i) => titles(new Date(2026, 9, 1 + i, 12), "u1")));
  assert.ok(days.size >= 7, `only ${days.size} distinct sets in 10 days`);
  const users = new Set(["a", "b", "c", "d", "e", "f"].map((u) => titles(NOW, u)));
  assert.ok(users.size >= 3);
});

test("a points mission never asks for more than the daily cap", () => {
  for (let i = 0; i < 60; i++) {
    for (const m of dailyMissions([], 400, new Date(2026, 9, 1 + i, 12), "u1")) {
      if (m.id === "pts") assert.ok(m.target <= 150, `target ${m.target}`);
    }
  }
});

test("renewsIn counts down to local midnight", () => {
  assert.equal(renewsIn(new Date(2026, 9, 1, 18, 0)), "6 h");
  assert.equal(renewsIn(new Date(2026, 9, 1, 23, 20)), "40 min");
});
