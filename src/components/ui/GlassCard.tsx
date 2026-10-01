import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  /** Stagger index for lists — each step delays the entrance a bit more so
   * cards settle in one after another instead of all popping at once. */
  entranceDelay?: number;
}

export default function GlassCard({ children, style, intensity = 35, entranceDelay = 0 }: Props) {
  const { radii, shadow } = useTheme();
  return (
    <Animated.View
      entering={FadeInUp.duration(420).delay(entranceDelay).springify().damping(18).mass(0.7)}
      style={[{ borderRadius: radii.card }, shadow]}
    >
      <GlassSurface radius={radii.card} intensity={intensity} style={[styles.inner, style]}>
        {children}
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 18 },
});
