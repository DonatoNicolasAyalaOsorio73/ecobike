import { test } from "node:test";
import assert from "node:assert/strict";
import { BIKE_PARTS, dueCount, partStatus } from "../maintenance.ts";

const chain = BIKE_PARTS.find((p) => p.id === "chain")!;

test("partStatus: never serviced counts from 0 km", () => {
  const s = partStatus(chain, 150, {});
  assert.equal(s.sinceKm, 150);
  assert.equal(s.ratio, 0.5);
  assert.equal(s.due, false);
  assert.equal(s.remainingKm, 150);
});

test("partStatus: due at the interval, measured since last service", () => {
  assert.equal(partStatus(chain, 700, { chain: 400 }).due, true);
  assert.equal(partStatus(chain, 699, { chain: 400 }).due, false);
});

test("partStatus: service mark above odometer (deleted rides) never goes negative", () => {
  const s = partStatus(chain, 100, { chain: 250 });
  assert.equal(s.sinceKm, 0);
  assert.equal(s.due, false);
});

test("dueCount counts overdue parts", () => {
  assert.equal(dueCount(0, {}), 0);
  assert.equal(dueCount(600, {}), 2); // chain (300) + tires (500)
});
