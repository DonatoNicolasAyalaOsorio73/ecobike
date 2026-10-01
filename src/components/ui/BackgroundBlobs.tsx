import React from "react";
import { Platform, StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@/theme/useTheme";

export default function BackgroundBlobs({ variant = "default" }: { variant?: "default" | "auth" }) {
  const { colors, isDark } = useTheme();
  const isWeb = Platform.OS === "web";

  return (
    <View style={[StyleSheet.absoluteFill, styles.noPointerEvents, { overflow: "hidden" }]}>
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={StyleSheet.absoluteFill} />

      <View style={[styles.blob, styles.blobTopLeft, { backgroundColor: colors.blobGreen }]} />
      <View style={[styles.blob, styles.blobRight, { backgroundColor: colors.blobGreenSoft }]} />
      {variant === "auth" && (
        <View style={[styles.blob, styles.blobBottomLeft, { backgroundColor: colors.blobGreen }]} />
      )}

      {isWeb ? (
        // expo-blur's web BlurView renders as a flat tint with no real blur —
        // CSS backdrop-filter actually blurs the blobs behind it here.
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backdropFilter: "blur(44px)",
              WebkitBackdropFilter: "blur(44px)",
              backgroundColor: isDark ? "rgba(14,20,16,0.25)" : "rgba(255,255,255,0.35)",
            } as ViewStyle,
          ]}
        />
      ) : (
        <BlurView intensity={70} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noPointerEvents: { pointerEvents: "none" },
  blob: { position: "absolute", borderRadius: 999, opacity: 0.55 },
  blobTopLeft: { width: 260, height: 260, top: -80, left: -90 },
  blobRight: { width: 300, height: 300, top: 120, right: -140 },
  blobBottomLeft: { width: 260, height: 260, bottom: -100, left: -110 },
});
