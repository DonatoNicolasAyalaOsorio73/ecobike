import React, { useEffect } from "react";
import { View } from "react-native";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { RideMapProps } from "./RideMap.native";

// No Google/Apple Maps SDK on web — OpenStreetMap tiles need no API key and
// keep Web genuinely usable instead of a dead placeholder (rule 16).
function Recenter({ center }: { center: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView([center.lat, center.lng], map.getZoom() < 14 ? 16 : map.getZoom());
  }, [center, map]);
  return null;
}

export default function RideMap({ route, center, height = 260 }: RideMapProps) {
  const initialCenter = center ?? route[0] ?? { lat: 4.7110, lng: -74.0721 }; // Bogotá fallback
  const positions = route.map((p) => [p.lat, p.lng] as [number, number]);

  return (
    <View style={{ height, width: "100%", borderRadius: 24, overflow: "hidden" }}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {positions.length > 1 && <Polyline positions={positions} color="#6FA524" weight={5} />}
        {center && <CircleMarker center={[center.lat, center.lng]} radius={8} pathOptions={{ color: "#ADF14B", fillOpacity: 1 }} />}
        <Recenter center={center} />
      </MapContainer>
    </View>
  );
}
