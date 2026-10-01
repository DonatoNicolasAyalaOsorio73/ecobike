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
