import { test } from "node:test";
import assert from "node:assert/strict";
import { cumulativeMeters, distanceLabel, maneuverIcon, navigate, remainingLabel, type Maneuver } from "../navigation.ts";

// A straight 1 km route due north, one point every 100 m (≈ 0.0009° of latitude).
const STEP = 100 / 111194.93;
const route = Array.from({ length: 11 }, (_, i) => ({ lat: 4.6 + i * STEP, lng: -74.08 }));
const cum = cumulativeMeters(route);
const maneuvers: Maneuver[] = [
  { instruction: "Salga hacia el norte.", type: 1, beginIndex: 0 },
  { instruction: "Gire a la derecha.", type: 10, beginIndex: 4 },
  { instruction: "Gire a la izquierda.", type: 15, beginIndex: 8 },
  { instruction: "Ha llegado a su destino.", type: 4, beginIndex: 10 },
];

test("cumulativeMeters adds up the route length", () => {
  assert.ok(Math.abs(cum[10] - 1000) < 1);
});

test("navigate: next turn ahead and its distance along the route", () => {
  const s = navigate(route, cum, maneuvers, route[1]);
  assert.equal(s.next?.instruction, "Gire a la derecha.");
  assert.ok(Math.abs(s.distanceM - 300) < 1);
  assert.ok(Math.abs(s.remainingM - 900) < 1);
  assert.equal(s.offRoute, false);
  assert.equal(s.arrived, false);
});

test("navigate: passes a turn and moves on to the next one", () => {
  assert.equal(navigate(route, cum, maneuvers, route[5]).next?.instruction, "Gire a la izquierda.");
});

test("navigate: off route beyond 50 m from the line", () => {
  assert.equal(navigate(route, cum, maneuvers, { lat: route[3].lat, lng: -74.08 + 0.001 }).offRoute, true); // ~110 m east
});

test("navigate: arrived near the destination", () => {
  assert.equal(navigate(route, cum, maneuvers, route[10]).arrived, true);
});

test("distanceLabel speaks like a navigation app", () => {
  assert.equal(distanceLabel(12), "Ahora");
  assert.equal(distanceLabel(237), "En 240 m");
  assert.equal(distanceLabel(1240), "En 1,2 km");
});

test("maneuverIcon maps turn directions", () => {
  assert.equal(maneuverIcon(10), "return-up-forward");
  assert.equal(maneuverIcon(15), "return-up-back");
  assert.equal(maneuverIcon(4), "flag");
  assert.equal(maneuverIcon(8), "arrow-up");
});

test("distanceLabel never shows 1000 m", () => {
  assert.equal(distanceLabel(996), "En 1,0 km");
  assert.equal(distanceLabel(994), "En 990 m");
});

test("remainingLabel uses the same rounding (never 1000 m)", () => {
  assert.equal(remainingLabel(996), "1,0 km");
  assert.equal(remainingLabel(450), "450 m");
});
