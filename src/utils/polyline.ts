/**
 * Decodes an encoded polyline (Google's algorithm). Valhalla uses precision 6
 * ("polyline6"); OSRM/Google use 5.
 */
export function decodePolyline(encoded: string, precision = 6): { lat: number; lng: number }[] {
  const factor = 10 ** precision;
  const out: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    out.push({ lat: lat / factor, lng: lng / factor });
  }
  return out;
}
