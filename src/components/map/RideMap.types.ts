/**
 * The one contract every RideMap implementation follows:
 * RideMap.web.tsx (Leaflet + OpenStreetMap), RideMap.android.tsx (MapLibre +
 * OpenFreeMap) and RideMap.native.tsx (Apple Maps, used on iOS).
 */
export interface RideMapProps {
  route: { lat: number; lng: number }[];
  center: { lat: number; lng: number } | null;
  height?: number;
  /** Fill the parent edge to edge (map as screen background) instead of a rounded card. */
  fill?: boolean;
  /** Bump to re-center the camera on `center` (the "locate me" button). */
  recenterKey?: number;
  /** Frame the whole route instead of following `center` (ride detail). */
  fitRoute?: boolean;
  /** Rider heading in degrees (0 = north). Web and Android draw an arrow (a dot when unknown); iOS uses the system marker, which shows heading. */
  heading?: number | null;
  /** A planned route (Eco ruta) drawn under the ride trace. */
  plannedRoute?: { lat: number; lng: number }[];
  /** Frame the planned route (Eco ruta preview) instead of following `center`. */
  fitPlanned?: boolean;
}
