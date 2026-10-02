import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { AppleMaps, GoogleMaps } from "expo-maps";
import { useTheme } from "@/theme/useTheme";
import { routeCamera } from "@/utils/mapCamera";

// Google Maps: hide business pins and POI icons (keep park names) so streets read clearly.
const GOOGLE_CLEAN_STYLE = JSON.stringify([
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "simplified" }] },
]);

// expo-maps doesn't export the POI enum publicly; its values are these strings.
const APPLE_POIS = ["PARK", "NATIONAL_PARK", "PUBLIC_TRANSPORT"] as unknown as NonNullable<NonNullable<AppleMaps.MapProperties["pointsOfInterest"]>["including"]>;

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
  /** Rider heading in degrees (0 = north). Web draws an arrow; native uses the system location marker, which already shows heading. */
  heading?: number | null;
  /** A planned route (Eco ruta) drawn under the ride trace. */
  plannedRoute?: { lat: number; lng: number }[];
  /** Frame the planned route (Eco ruta preview) instead of following `center`. */
  fitPlanned?: boolean;
}

/**
 * expo-maps has no single cross-platform component by design (Apple Maps and
 * Google Maps have genuinely different feature sets) — this wrapper picks
 * the native one per platform and exposes only what the app uses.
 */
export default function RideMap({ route, center, height = 260, fill, recenterKey = 0, fitRoute, plannedRoute, fitPlanned }: RideMapProps) {
  const { isDark } = useTheme();
  const coordinates = route.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  // A new object identity (keyed by recenterKey) makes the camera move again.
  const cameraPosition = React.useMemo(() => {
    const fit = fitRoute ? routeCamera(route) : fitPlanned && plannedRoute ? routeCamera(plannedRoute) : null;
    if (fit) return { coordinates: { latitude: fit.center.lat, longitude: fit.center.lng }, zoom: fit.zoom };
    // Street level: the rider wants to see the road around them, not the city.
    return center ? { coordinates: { latitude: center.lat, longitude: center.lng }, zoom: 17.5 } : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center?.lat, center?.lng, recenterKey, fitRoute, route.length, fitPlanned, plannedRoute]);
  // Ink casing under the lime line (Apple Maps style) keeps the light route legible.
  const planned = (plannedRoute ?? []).map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const following = planned.length > 1;
  const polylines = [
    // Path to follow (Eco ruta): glowing green — wide soft halo, green line, bright core.
    ...(following
      ? [
          { coordinates: planned, color: "rgba(123,245,16,0.28)", width: 18 },
          { coordinates: planned, color: "#7BF510", width: 7 },
          { coordinates: planned, color: "rgba(255,255,255,0.85)", width: 2 },
        ]
      : []),
    // Ridden trace: dark over the green path; lime with ink casing on a free ride.
    ...(coordinates.length > 1
      ? following
        ? [{ coordinates, color: "rgba(28,36,16,0.9)", width: 5 }]
        : [{ coordinates, color: "rgba(28,36,16,0.35)", width: 9 }, { coordinates, color: "#7BF510", width: 6 }]
      : []),
  ];
  const wrap = fill ? StyleSheet.absoluteFill : [styles.card, { height }];

  return (
    <View style={wrap}>
      {Platform.OS === "ios" ? (
        <AppleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          colorScheme={isDark ? AppleMaps.MapColorScheme.DARK : AppleMaps.MapColorScheme.LIGHT}
          // Only what matters on a bike: parks and transit; shops and the rest stay hidden.
          properties={{
            isMyLocationEnabled: true,
            pointsOfInterest: { including: APPLE_POIS },
          }}
          uiSettings={{ myLocationButtonEnabled: false, compassEnabled: true }}
          polylines={polylines}
        />
      ) : (
        <GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={cameraPosition}
          colorScheme={isDark ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
          properties={{ isMyLocationEnabled: true, mapStyleOptions: { json: GOOGLE_CLEAN_STYLE } }}
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
