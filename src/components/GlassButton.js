import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadowStyle } from "../theme/colors";

/**
 * variant="primary"   -> solid green liquid-glass pill (main CTA)
 * variant="secondary" -> translucent white glass pill (secondary CTA)
 */
export default function GlassButton({
  label,
  icon,
  onPress,
  variant = "primary",
  style,
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        shadowStyle,
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        style,
      ]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={[colors.primaryLight, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, styles.border]}
        >
          {icon ? (
            <Ionicons name={icon} size={18} color={colors.ink} style={styles.icon} />
          ) : null}
          <Text style={styles.label}>{label}</Text>
        </LinearGradient>
      ) : (
        <BlurView intensity={45} tint="light" style={[styles.inner, styles.border, styles.secondaryFill]}>
          {icon ? (
            <Ionicons name={icon} size={18} color={colors.ink} style={styles.icon} />
          ) : null}
          <Text style={styles.label}>{label}</Text>
        </BlurView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radii.pill,
    overflow: "hidden",
  },
  border: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secondaryFill: {
    backgroundColor: colors.glassFillStrong,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
});
