import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { validateRide } = createRequire(import.meta.url)("./_lib.js");

const now = 1_800_000_000_000;
const ride = (o = {}) => ({ id: "ride_abc123", startedAt: now - 3600_000, endedAt: now, distanceMeters: 15_000, durationSeconds: 3600, ...o });

test("awards points from distance, same formula as the app", () => {
  assert.equal(validateRide(ride(), now).points, 170); // 15 km * 10 + 20
});

test("tiny rides earn nothing (no +20 farming)", () => {
  assert.equal(validateRide(ride({ distanceMeters: 50 }), now).points, 0);
});

test("rejects car-speed rides", () => {
  assert.match(validateRide(ride({ distanceMeters: 100_000 }), now).error, /Velocidad/);
});

test("rejects duration longer than the time window", () => {
  assert.match(validateRide(ride({ durationSeconds: 7200 }), now).error, /Duración/);
});

test("rejects bad ids, future and stale rides", () => {
  assert.ok(validateRide(ride({ id: "../x" }), now).error);
  assert.ok(validateRide(ride({ endedAt: now + 3600_000 }), now).error);
  assert.ok(validateRide(ride({ startedAt: now - 40 * 86400_000 }), now).error);
  assert.ok(validateRide(ride({ distanceMeters: "15000" }), now).error);
});

const { chatIdFor, cleanMessage } = createRequire(import.meta.url)("./_lib.js");

test("chatIdFor is order-independent", () => {
  assert.equal(chatIdFor("b", "a"), chatIdFor("a", "b"));
  assert.equal(chatIdFor("a", "b"), "a__b");
});

test("cleanMessage trims, rejects empty, non-strings and over-long text", () => {
  assert.deepEqual(cleanMessage("  hola  "), { text: "hola" });
  assert.ok(cleanMessage("   ").error);
  assert.ok(cleanMessage(42).error);
  assert.ok(cleanMessage("x".repeat(1001)).error);
  assert.equal(cleanMessage("x".repeat(1000)).text.length, 1000);
});

const { nextWeekly } = createRequire(import.meta.url)("./rides.js");
const { weekKey } = createRequire(import.meta.url)("./_lib.js");

test("nextWeekly adds this week, resets on a new week, ignores past-week rides, never negative", () => {
  const thisWeek = weekKey(Date.now());
  assert.deepEqual(nextWeekly({ weekKey: thisWeek, weekPoints: 50 }, thisWeek, 30), { weekKey: thisWeek, weekPoints: 80 });
  assert.deepEqual(nextWeekly({ weekKey: "2000-W01", weekPoints: 999 }, thisWeek, 30), { weekKey: thisWeek, weekPoints: 30 });
  assert.equal(nextWeekly({ weekKey: thisWeek, weekPoints: 50 }, "2000-W01", 30), null);
  assert.equal(nextWeekly({ weekKey: thisWeek, weekPoints: 10 }, thisWeek, -40).weekPoints, 0);
});

const { slug } = createRequire(import.meta.url)("./me.js");

test("username slug from email prefix is valid and bounded", () => {
  assert.equal(slug("Ana.Bike"), "ana.bike");
  assert.equal(slug("josé-pérez+test"), "jospreztest");
  assert.match(slug("x"), /^[a-z0-9._]{3,20}$/);
  assert.ok(slug("a".repeat(40)).length <= 16);
});
