import { test } from "node:test";
import assert from "node:assert/strict";
import { rankByProximity } from "../../services/routing.ts";

const p = (name: string, distanceKm: number | null) => ({ name, detail: "", lat: 0, lng: 0, distanceKm });

test("rankByProximity: places near the rider first (closest first), far ones keep relevance order", () => {
  const ranked = rankByProximity([p("Famoso lejos", 400), p("Cerca 5", 5), p("Otro lejos", 900), p("Cerca 2", 2)]);
  assert.deepEqual(ranked.map((x) => x.name), ["Cerca 2", "Cerca 5", "Famoso lejos", "Otro lejos"]);
});

test("rankByProximity: without a known position the order is untouched", () => {
  assert.deepEqual(rankByProximity([p("A", null), p("B", null)]).map((x) => x.name), ["A", "B"]);
});
