import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useTheme } from "@/theme/useTheme";

export interface RideMapProps {
  route: { lat: number; lng: number }[];
  center: { lat: number; lng: number } | null;
  height?: number;
}

/**
 * expo-maps has no single cross-platform component by design (Apple Maps and
 * Google Maps have genuinely different feature sets) — this wrapper picks
 * the native one per rule 5 (Apple-first, but never break Android) and
 * exposes only the subset of props this app actually uses.
 */
export default function RideMap({ route, center, height = 260 }: RideMapProps) {
  const { isDark } = useTheme();
  const coordinates = route.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const cameraPosition = center
    ? { coordinates: { latitude: center.lat, longitude: center.lng }, zoom: 16 }
    : undefined;

  if (Platform.OS === "ios") {
    return (
      <View style={[styles.wrap, { height }]}>
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          colorScheme={isDark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
          properties={{ isMyLocationEnabled: true }}
          uiSettings={{ myLocationButtonEnabled: true, compassEnabled: true }}
          polylines={
            coordinates.length > 1
              ? [{ coordinates, color: "#ADF14B", width: 5 }]
              : []
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <GoogleMaps.View
        style={StyleSheet.absoluteFill}
        cameraPosition={cameraPosition}
        colorScheme={isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
        properties={{ isMyLocationEnabled: true }}
        uiSettings={{ myLocationButtonEnabled: true, compassEnabled: true }}
        polylines={
          coordinates.length > 1
            ? [{ coordinates, color: "#ADF14B", width: 5 }]
            : []
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", borderRadius: 24, overflow: "hidden" },
});
