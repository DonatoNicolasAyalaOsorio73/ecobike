import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { daysLeftInWeek, weekKey } from "../week.ts";
const server = createRequire(import.meta.url)("../../../api/_lib.js");

// Known ISO weeks (dates at noon Colombia time = 17:00 UTC).
const CASES: [string, string][] = [
  ["2026-10-01T17:00:00Z", "2026-W40"], // Thursday
  ["2026-09-28T17:00:00Z", "2026-W40"], // Monday
  ["2026-10-04T17:00:00Z", "2026-W40"], // Sunday
  ["2026-10-05T17:00:00Z", "2026-W41"], // next Monday
  ["2027-01-01T17:00:00Z", "2026-W53"], // 2026 has 53 ISO weeks
  ["2025-12-29T17:00:00Z", "2026-W01"], // ISO year starts the week before
];

test("weekKey matches ISO weeks and the server implementation", () => {
  for (const [iso, expected] of CASES) {
    const ms = Date.parse(iso);
    assert.equal(weekKey(ms), expected, iso);
    assert.equal(server.weekKey(ms), expected, `server ${iso}`);
  }
});

test("weekKey uses Colombia time: Sunday 23:00 local is still the same week", () => {
  // Monday 03:00 UTC = Sunday 22:00 in Bogotá
  assert.equal(weekKey(Date.parse("2026-10-05T03:00:00Z")), "2026-W40");
});

test("daysLeftInWeek", () => {
  assert.equal(daysLeftInWeek(new Date(2026, 8, 28)), 7); // Monday
  assert.equal(daysLeftInWeek(new Date(2026, 9, 4)), 1); // Sunday
});
