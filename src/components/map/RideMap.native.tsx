import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useTheme } from "@/theme/useTheme";
import { routeCamera } from "@/utils/mapCamera";

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
}

/**
 * expo-maps has no single cross-platform component by design (Apple Maps and
 * Google Maps have genuinely different feature sets) — this wrapper picks
 * the native one per platform and exposes only what the app uses.
 */
export default function RideMap({ route, center, height = 260, fill, recenterKey = 0, fitRoute }: RideMapProps) {
  const { isDark } = useTheme();
  const coordinates = route.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  // A new object identity (keyed by recenterKey) makes the camera move again.
  const cameraPosition = React.useMemo(() => {
    const fit = fitRoute ? routeCamera(route) : null;
    if (fit) return { coordinates: { latitude: fit.center.lat, longitude: fit.center.lng }, zoom: fit.zoom };
    return center ? { coordinates: { latitude: center.lat, longitude: center.lng }, zoom: 16 } : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng, recenterKey, fitRoute, route.length]);
  // Ink casing under the lime line (Apple Maps style) keeps the light route legible.
  const polylines = coordinates.length > 1 ? [{ coordinates, color: "rgba(28,36,16,0.35)", width: 9 }, { coordinates, color: "#ADF14B", width: 6 }] : [];
  const wrap = fill ? StyleSheet.absoluteFill : [styles.card, { height }];

  return (
    <View style={wrap}>
      {Platform.OS === "ios" ? (
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          colorScheme={isDark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
          properties={{ isMyLocationEnabled: true }}
          uiSettings={{ myLocationButtonEnabled: false, compassEnabled: true }}
          polylines={polylines}
        />
      ) : (
        <GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          colorScheme={isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
          properties={{ isMyLocationEnabled: true }}
          uiSettings={{ myLocationButtonEnabled: false, compassEnabled: true, zoomControlsEnabled: false }}
          polylines={polylines}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: 24, overflow: "hidden" },
});
