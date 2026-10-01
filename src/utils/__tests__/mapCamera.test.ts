import { test } from "node:test";
import assert from "node:assert/strict";
import { routeCamera } from "../mapCamera.ts";

test("routeCamera centers on the bounding box and zooms out for bigger routes", () => {
  assert.equal(routeCamera([]), null);
  const small = routeCamera([{ lat: 4.6, lng: -74.08 }, { lat: 4.61, lng: -74.07 }])!;
  assert.ok(Math.abs(small.center.lat - 4.605) < 1e-9);
  const big = routeCamera([{ lat: 4.5, lng: -74.2 }, { lat: 4.9, lng: -73.9 }])!;
  assert.ok(big.zoom < small.zoom);
  const single = routeCamera([{ lat: 4.6, lng: -74.08 }])!;
  assert.ok(single.zoom <= 17 && single.zoom >= 3);
});
