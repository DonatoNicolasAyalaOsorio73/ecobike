import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { colors } from "../theme/colors";

/**
 * Soft, blurred color blobs + a white->pale-green gradient wash.
 * This is what gives the "liquid glass" screens their ambient light,
 * and is what every translucent card / input floats on top of.
 */
export default function BackgroundBlobs({ variant = "default" }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.bgTop, colors.bgBottom]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.blob, styles.blobTopLeft]} />
      <View style={[styles.blob, styles.blobRight]} />
      {variant === "auth" && (
        <View style={[styles.blob, styles.blobBottomLeft]} />
      )}

      {/* A very light overall blur ties the blobs into the glass surfaces */}
      <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.55,
  },
  blobTopLeft: {
    width: 260,
    height: 260,
    backgroundColor: colors.blobGreen,
    top: -80,
    left: -90,
  },
  blobRight: {
    width: 300,
    height: 300,
    backgroundColor: colors.blobGreenSoft,
    top: 120,
    right: -140,
  },
  blobBottomLeft: {
    width: 260,
    height: 260,
    backgroundColor: colors.blobGreen,
    bottom: -100,
    left: -110,
  },
});
