import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDistance, formatDuration, formatSpeed } from "../format.ts";

test("formatDuration: seconds, minutes, and hours buckets", () => {
  assert.equal(formatDuration(45), "45s");
  assert.equal(formatDuration(125), "2m 05s");
  assert.equal(formatDuration(3725), "1h 02m");
});

test("formatDistance: metric vs imperial", () => {
  assert.equal(formatDistance(10_000, "metric"), "10.00 km");
  assert.equal(formatDistance(1609.344, "imperial"), "1.00 mi");
});

test("formatSpeed: metric vs imperial", () => {
  assert.equal(formatSpeed(20, "metric"), "20.0 km/h");
  assert.equal(formatSpeed(20, "imperial"), "12.4 mph");
});
