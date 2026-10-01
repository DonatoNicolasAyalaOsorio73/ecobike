import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { RideMapProps } from "./RideMap.native";
import { useTheme } from "@/theme/useTheme";
import { routeCamera } from "@/utils/mapCamera";

const BOGOTA = { lat: 4.711, lng: -74.0721 };

// Dark mode for OSM tiles without another tile provider: invert + hue-rotate
// keeps streets readable and matches the app's dark glass surfaces.
const DARK_TILES_CSS = ".ecobike-dark .leaflet-tile{filter:invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)}";
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
  useEffect(() => {
    if (fitTo) {
      map.fitBounds(fitTo, { padding: [28, 28] });
      return;
    }
    if (center) map.flyTo([center.lat, center.lng], map.getZoom() < 14 ? 16 : map.getZoom(), { duration: 0.8 });
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
        zoom={15}
        zoomControl={false} // pinch / wheel to zoom; keeps the corners free for app controls
        className={isDark ? "ecobike-dark" : undefined}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: "#6FA524", weight: 6, lineCap: "round" }} />}
        {center && (
          <CircleMarker center={[center.lat, center.lng]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#ADF14B", fillOpacity: 1 }} />
        )}
        <Recenter center={center} recenterKey={recenterKey} fitTo={fitRoute ? routeCamera(route)?.bounds ?? null : null} />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: 24, overflow: "hidden" },
});
