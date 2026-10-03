import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RideMapProps } from "./RideMap.types";
import { useTheme } from "@/theme/useTheme";
import { routeCamera } from "@/utils/mapCamera";

const BOGOTA = { lat: 4.711, lng: -74.0721 };
/**
 * The rider's marker (Leaflet divIcon: plain HTML, no image asset): an arrow
 * rotated to the heading, or a plain dot when the heading is unknown (no
 * compass, not moving) instead of an arrow confidently pointing north.
 */
function arrowIcon(deg: number | null) {
  if (deg == null) {
    const dot = `<div style="width:22px;height:22px;border-radius:50%;background:#1C2410;border:3px solid #FFFFFF;box-shadow:0 0 0 8px rgba(28,36,16,0.12)"></div>`;
    return L.divIcon({ html: dot, className: "", iconSize: [22, 22], iconAnchor: [11, 11] });
  }
  const html =
    `<div style="width:44px;height:44px;transform:rotate(${Math.round(deg)}deg);transition:transform .3s ease">` +
    `<svg viewBox="0 0 44 44" width="44" height="44">` +
    `<circle cx="22" cy="22" r="20" fill="rgba(28,36,16,0.12)"/>` +
    `<path d="M22 8 L33 34 L22 28 L11 34 Z" fill="#1C2410" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>` +
    `</svg></div>`;
  return L.divIcon({ html, className: "", iconSize: [44, 44], iconAnchor: [22, 22] });
}

// Integer zooms: Leaflet snaps fractional ones (17.5 → 18, where OSM floods the map with shop icons).
const STREET_ZOOM = 17;
const FOLLOW_ZOOM = 16;

// Dark mode for OSM tiles without another tile provider: invert + hue-rotate
// keeps streets readable and matches the app's dark glass surfaces.
const DARK_TILES_CSS =
  ".ecobike-dark .leaflet-tile{filter:invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9)}" +
  // Light map: calmer colors (less saturated POIs/landuse), labels stay crisp.
  ".ecobike-clean{filter:saturate(0.55) brightness(1.04) contrast(0.97)}" +
  // Glow halo under the path to follow.
  ".ecobike-glow{filter:blur(4px)}";
let cssInjected = false;
function injectCss() {
  if (cssInjected || typeof document === "undefined") return;
  const el = document.createElement("style");
  el.textContent = DARK_TILES_CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

function Recenter({ center, recenterKey, fitTo, roomForCard }: { center: { lat: number; lng: number } | null; recenterKey: number; fitTo: [[number, number], [number, number]] | null; roomForCard?: boolean }) {
  const map = useMap();
  const lastKey = React.useRef(recenterKey);
  useEffect(() => {
    if (fitTo) {
      // Full-screen preview: leave room for the top controls and the card at the bottom.
      // Room for the preview card, but never more padding than a short window has.
      if (roomForCard) map.fitBounds(fitTo, { paddingTopLeft: [28, 90], paddingBottomRight: [28, Math.min(320, map.getSize().y * 0.45)] });
      else map.fitBounds(fitTo, { padding: [28, 28] });
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
export default function RideMap({ route, center, height = 260, fill, recenterKey = 0, fitRoute, heading, plannedRoute, fitPlanned }: RideMapProps) {
  const { isDark } = useTheme();
  injectCss();
  const initialCenter = center ?? route[0] ?? BOGOTA;
  const positions = route.map((p) => [p.lat, p.lng] as [number, number]);
  const plannedPositions = (plannedRoute ?? []).map((p) => [p.lat, p.lng] as [number, number]);
  // Rebuilt only when the heading moves ≥ 5°, not on every GPS fix.
  const bucket = heading == null ? null : Math.round(heading / 5) * 5;
  const icon = useMemo(() => arrowIcon(bucket), [bucket]);

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
        {/* Path to follow (Eco ruta): glowing green — a soft blurred halo, the green line, a bright core. */}
        {plannedPositions.length > 1 && <Polyline positions={plannedPositions} pathOptions={{ color: "#7BF510", weight: 18, opacity: 0.35, lineCap: "round", lineJoin: "round", className: "ecobike-glow" }} />}
        {plannedPositions.length > 1 && <Polyline positions={plannedPositions} pathOptions={{ color: "#7BF510", weight: 7, lineCap: "round", lineJoin: "round" }} />}
        {plannedPositions.length > 1 && <Polyline positions={plannedPositions} pathOptions={{ color: "#FFFFFF", weight: 2, opacity: 0.85, lineCap: "round", lineJoin: "round" }} />}
        {/* Ridden trace: dark over the green path (progress reads at a glance); lime with ink casing on a free ride. */}
        {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: "#1C2410", weight: plannedPositions.length > 1 ? 5 : 9, opacity: plannedPositions.length > 1 ? 0.9 : 0.35, lineCap: "round" }} />}
        {positions.length > 1 && plannedPositions.length < 2 && <Polyline positions={positions} pathOptions={{ color: "#7BF510", weight: 6, lineCap: "round" }} />}
        {/* You-are-here: a heading arrow (ink with a white outline over a soft halo) so you can tell which way you face. */}
        {center && <Marker position={[center.lat, center.lng]} icon={icon} interactive={false} keyboard={false} zIndexOffset={1000} />}
        <Recenter center={center} recenterKey={recenterKey} fitTo={fitRoute ? routeCamera(route)?.bounds ?? null : fitPlanned && plannedRoute ? routeCamera(plannedRoute)?.bounds ?? null : null} roomForCard={!fitRoute && !!fitPlanned} />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: 24, overflow: "hidden" },
});
