import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { RideMapProps } from "./RideMap.native";
import { useTheme } from "@/theme/useTheme";
import { routeCamera } from "@/utils/mapCamera";

const BOGOTA = { lat: 4.711, lng: -74.0721 };
// Integer zooms: Leaflet snaps fractional ones (17.5 → 18, where OSM floods the map with shop icons).
const STREET_ZOOM = 17;
const FOLLOW_ZOOM = 16;

// Dark mode for OSM tiles without another tile provider: invert + hue-rotate
// keeps streets readable and matches the app's dark glass surfaces.
const DARK_TILES_CSS =
  ".ecobike-dark .leaflet-tile{filter:invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)}" +
  // Light map: calmer colors (less saturated POIs/landuse), labels stay crisp.
  ".ecobike-clean{filter:saturate(0.55) brightness(1.04) contrast(0.97)}";
let cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = DARK_TILES_CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

function Recenter({ center, recenterKey, fitTo }: { center: { lat: number; lng: number } | null; recenterKey: number; fitTo: [[number, number], [number, number]] | null }) {
  const map = useMap();
  const lastKey = React.useRef(recenterKey);
  useEffect(() => {
    if (fitTo) {
      map.fitBounds(fitTo, { padding: [28, 28] });
      return;
    }
    if (!center) return;
    // "Locate me" always lands at street level (the rider wants to see the road);
    // following updates keep the rider's zoom but never drift out past FOLLOW_ZOOM.
    const located = lastKey.current !== recenterKey;
    lastKey.current = recenterKey;
    map.flyTo([center.lat, center.lng], located ? STREET_ZOOM : Math.max(map.getZoom(), FOLLOW_ZOOM), { duration: 0.8 });
  }, [center?.lat, center?.lng, recenterKey, map, fitTo?.[0][0], fitTo?.[1][1]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** OpenStreetMap via Leaflet: no API key, works in any browser. */
export default function RideMap({ route, center, height = 260, fill, recenterKey = 0, fitRoute }: RideMapProps) {
  const { isDark } = useTheme();
  injectCss();
  const initialCenter = center ?? route[0] ?? BOGOTA;
  const positions = route.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    // zIndex 0 gives the map its own stacking context, so Leaflet's panes
    // (z-index 400+) can't paint over the app's floating glass controls.
    <View style={fill ? [StyleSheet.absoluteFill, { zIndex: 0 }] : [styles.card, { height, zIndex: 0 }]}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={STREET_ZOOM}
        zoomControl={false} // pinch / wheel to zoom; keeps the corners free for app controls
        className={isDark ? "ecobike-dark" : undefined}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Standard OSM tiles (keyless, reliable), softened by .ecobike-clean so
            the base recedes and the route + street names stand out. */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="ecobike-clean"
        />
        {/* Lime route with an ink casing (Apple Maps style) so a light line stays legible on any tile. */}
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: "#1C2410", weight: 9, opacity: 0.35, lineCap: "round" }} />}
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: "#7BF510", weight: 6, lineCap: "round" }} />}
        {/* You-are-here: soft accuracy halo + ink dot with a white ring (readable on any street color). */}
        {center && <CircleMarker center={[center.lat, center.lng]} radius={22} pathOptions={{ stroke: false, fillColor: "#1C2410", fillOpacity: 0.1 }} />}
        {center && (
          <CircleMarker center={[center.lat, center.lng]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#1C2410", fillOpacity: 1 }} />
        )}
        <Recenter center={center} recenterKey={recenterKey} fitTo={fitRoute ? routeCamera(route)?.bounds ?? null : null} />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: 24, overflow: "hidden" },
});
