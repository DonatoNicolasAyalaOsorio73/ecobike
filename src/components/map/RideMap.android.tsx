import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef, type LngLat } from "@maplibre/maplibre-react-native";
import { routeCamera } from "@/utils/mapCamera";
import type { RideMapProps } from "./RideMap.types";

/**
 * Android map: MapLibre with OpenFreeMap vector tiles (OpenStreetMap data).
 * Free for commercial use, no API key, no registration, no request limits;
 * attribution is required and MapLibre shows it. Same look and behavior as
 * the web map (RideMap.web.tsx): street-level follow camera, glowing green
 * Eco ruta path, lime ride trace, and a heading arrow (a dot when unknown).
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const BOGOTA: LngLat = [-74.0721, 4.711];
const STREET_ZOOM = 17;

const line = (points: { lat: number; lng: number }[]): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: "Feature",
  properties: {},
  geometry: { type: "LineString", coordinates: points.map((p) => [p.lng, p.lat]) },
});

const ROUND = { "line-cap": "round", "line-join": "round" } as const;

export default function RideMap({ route, center, height = 260, fill, recenterKey = 0, fitRoute, heading, plannedRoute, fitPlanned }: RideMapProps) {
  const camera = useRef<CameraRef>(null);
  const [ready, setReady] = useState(false);
  const lastKey = useRef<number | null>(null);

  // Camera: frame a route (ride detail, Eco ruta preview), otherwise follow the
  // rider. "Locate me" (a new recenterKey) jumps to street zoom; plain GPS
  // updates only pan, so a zoom the rider chose is kept.
  useEffect(() => {
    if (!ready) return;
    const fit = fitRoute ? routeCamera(route) : fitPlanned && plannedRoute ? routeCamera(plannedRoute) : null;
    if (fit) {
      const [[south, west], [north, east]] = fit.bounds;
      const padding = fitRoute ? { top: 28, bottom: 28, left: 28, right: 28 } : { top: 90, bottom: 320, left: 28, right: 28 };
      camera.current?.fitBounds([west, south, east, north], { padding, duration: 500 });
      return;
    }
    if (!center) return;
    const relocate = lastKey.current !== recenterKey;
    lastKey.current = recenterKey;
    camera.current?.easeTo({ center: [center.lng, center.lat], ...(relocate ? { zoom: STREET_ZOOM } : {}), duration: relocate ? 700 : 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, center?.lat, center?.lng, recenterKey, fitRoute, route.length, fitPlanned, plannedRoute]);

  const planned = plannedRoute ?? [];
  const following = planned.length > 1;
  const start: LngLat = center ? [center.lng, center.lat] : route[0] ? [route[0].lng, route[0].lat] : BOGOTA;
  const wrap = fill ? StyleSheet.absoluteFill : [styles.card, { height }];

  return (
    <View style={wrap}>
      <Map style={StyleSheet.absoluteFill} mapStyle={STYLE_URL} logo={false} attribution compass onDidFinishLoadingMap={() => setReady(true)}>
        <Camera ref={camera} initialViewState={{ center: start, zoom: center ? STREET_ZOOM : 13 }} />

        {following && (
          // Path to follow (Eco ruta): glowing green — wide soft halo, green line, bright core.
          <GeoJSONSource id="planned" data={line(planned)}>
            <Layer type="line" id="planned-halo" layout={ROUND} paint={{ "line-color": "rgba(123,245,16,0.28)", "line-width": 18 }} />
            <Layer type="line" id="planned-line" layout={ROUND} paint={{ "line-color": "#7BF510", "line-width": 7 }} />
            <Layer type="line" id="planned-core" layout={ROUND} paint={{ "line-color": "rgba(255,255,255,0.85)", "line-width": 2 }} />
          </GeoJSONSource>
        )}

        {route.length > 1 && (
          // Ridden trace: dark over the green path; lime with ink casing on a free ride.
          <GeoJSONSource id="ridden" data={line(route)}>
            {following ? (
              <Layer type="line" id="ridden-line" layout={ROUND} paint={{ "line-color": "rgba(28,36,16,0.9)", "line-width": 5 }} />
            ) : (
              <>
                <Layer type="line" id="ridden-casing" layout={ROUND} paint={{ "line-color": "rgba(28,36,16,0.35)", "line-width": 9 }} />
                <Layer type="line" id="ridden-line" layout={ROUND} paint={{ "line-color": "#7BF510", "line-width": 6 }} />
              </>
            )}
          </GeoJSONSource>
        )}

        {center && (
          <Marker id="rider" lngLat={[center.lng, center.lat]} anchor="center">
            <RiderMarker heading={heading ?? null} />
          </Marker>
        )}
      </Map>
    </View>
  );
}

/** Same marker as the web map: an arrow rotated to the heading, or a dot when it's unknown. */
function RiderMarker({ heading }: { heading: number | null }) {
  if (heading == null) {
    return (
      <Svg width={38} height={38} viewBox="0 0 38 38">
        <Circle cx={19} cy={19} r={18} fill="rgba(28,36,16,0.12)" />
        <Circle cx={19} cy={19} r={9} fill="#1C2410" stroke="#FFFFFF" strokeWidth={3} />
      </Svg>
    );
  }
  return (
    <View style={{ transform: [{ rotate: `${Math.round(heading)}deg` }] }}>
      <Svg width={44} height={44} viewBox="0 0 44 44">
        <Circle cx={22} cy={22} r={20} fill="rgba(28,36,16,0.12)" />
        <Path d="M22 8 L33 34 L22 28 L11 34 Z" fill="#1C2410" stroke="#FFFFFF" strokeWidth={3} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: 24, overflow: "hidden" },
});
