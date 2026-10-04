import React, { Suspense, lazy } from "react";
import { StyleSheet, View } from "react-native";
import type { RideMapProps } from "./RideMap.types";

// Leaflet (and its CSS) is only downloaded when a map is first shown, so the
// first screens of the web app don't pay for it.
const LeafletMap = lazy(() => import("./RideMapLeaflet"));

export default function RideMap(props: RideMapProps) {
    // Same box as the map so nothing shifts when it arrives.
  const placeholder = <View style={props.fill ? [StyleSheet.absoluteFill, { backgroundColor: "#EEF1EA" }] : { width: "100%", height: props.height ?? 260, borderRadius: 24, backgroundColor: "#EEF1EA" }} />;
  return (
    <Suspense fallback={placeholder}>
      <LeafletMap {...props} />
    </Suspense>
  );
}
