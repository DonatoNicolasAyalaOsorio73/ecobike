import { test } from "node:test";
import assert from "node:assert/strict";
import { avgSpeedKmh, haversineMeters, incrementalDistanceMeters, totalElevationGainMeters } from "../geo.ts";

test("haversineMeters: known distance between two real coordinates", () => {
  // Bogotá Plaza de Bolívar -> Parque Simón Bolívar, ~4.6km apart.
  const a = { lat: 4.5981, lng: -74.0761 };
  const b = { lat: 4.6584, lng: -74.0913 };
  const meters = haversineMeters(a, b);
  assert.ok(meters > 6000 && meters < 7500, `expected ~6.5-7km, got ${meters}`);
});

test("haversineMeters: same point is zero distance", () => {
  const p = { lat: 4.71, lng: -74.07 };
  assert.equal(haversineMeters(p, p), 0);
});

test("incrementalDistanceMeters: drops GPS jumps faster than 120km/h", () => {
  const prev = { lat: 4.71, lng: -74.07, altitude: null, timestamp: 0, speed: null };
  // ~2km away one second later would imply ~7200km/h — clearly a GPS glitch.
  const next = { lat: 4.73, lng: -74.07, altitude: null, timestamp: 1000, speed: null };
  assert.equal(incrementalDistanceMeters(prev, next), 0);
});

test("incrementalDistanceMeters: keeps a normal cycling-speed segment", () => {
  const prev = { lat: 4.71, lng: -74.07, altitude: null, timestamp: 0, speed: null };
  // ~14m in 3s is ~17km/h, a normal cycling pace.
  const next = { lat: 4.710126, lng: -74.07, altitude: null, timestamp: 3000, speed: null };
  const meters = incrementalDistanceMeters(prev, next);
  assert.ok(meters > 10 && meters < 20, `expected ~14m, got ${meters}`);
});

test("totalElevationGainMeters: only sums positive deltas", () => {
  const points = [
    { lat: 0, lng: 0, altitude: 100, timestamp: 0, speed: null },
    { lat: 0, lng: 0, altitude: 110, timestamp: 1000, speed: null },
    { lat: 0, lng: 0, altitude: 95, timestamp: 2000, speed: null },
    { lat: 0, lng: 0, altitude: 105, timestamp: 3000, speed: null },
  ];
  // +10 (100->110), -15 ignored, +10 (95->105) = 20
  assert.equal(totalElevationGainMeters(points), 20);
});

test("avgSpeedKmh: zero duration never divides by zero", () => {
  assert.equal(avgSpeedKmh(1000, 0), 0);
});

test("avgSpeedKmh: 10km in 30 minutes is 20km/h", () => {
  assert.equal(avgSpeedKmh(10_000, 1800), 20);
});

test("bearingDegrees: north, east, south, west", async () => {
  const { bearingDegrees } = await import("../geo.ts");
  const o = { lat: 4.6, lng: -74.08 };
  assert.equal(Math.round(bearingDegrees(o, { lat: 4.61, lng: -74.08 })), 0);
  assert.equal(Math.round(bearingDegrees(o, { lat: 4.6, lng: -74.07 })), 90);
  assert.equal(Math.round(bearingDegrees(o, { lat: 4.59, lng: -74.08 })), 180);
  assert.equal(Math.round(bearingDegrees(o, { lat: 4.6, lng: -74.09 })), 270);
});
