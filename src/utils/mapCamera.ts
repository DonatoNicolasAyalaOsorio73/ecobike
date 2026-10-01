export interface LatLng {
  lat: number;
  lng: number;
}

/** Center + zoom that fits a route (for maps without fitBounds, e.g. expo-maps). */
export function routeCamera(route: LatLng[], paddingFactor = 1.4): { center: LatLng; zoom: number; bounds: [[number, number], [number, number]] } | null {
  if (route.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of route) {
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.002) * paddingFactor;
  // Web-mercator: each zoom level halves the visible degrees (360° at zoom 0).
  const zoom = Math.max(3, Math.min(17, Math.log2(360 / span)));
  return {
    center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
    zoom,
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
  };
}
