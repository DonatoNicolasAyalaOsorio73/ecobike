import { test } from "node:test";
import assert from "node:assert/strict";
import { decodePolyline } from "../polyline.ts";

test("decodePolyline: Google's reference example (precision 5)", () => {
  const pts = decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@", 5);
  assert.deepEqual(pts, [
    { lat: 38.5, lng: -120.2 },
    { lat: 40.7, lng: -120.95 },
    { lat: 43.252, lng: -126.453 },
  ]);
});

test("decodePolyline: precision 6 scales by 1e6", () => {
  // Same deltas as above read at precision 6 are 10x smaller.
  const pts = decodePolyline("_p~iF~ps|U", 6);
  assert.deepEqual(pts, [{ lat: 3.85, lng: -12.02 }]);
});

test("decodePolyline: empty string gives no points", () => {
  assert.deepEqual(decodePolyline(""), []);
});
