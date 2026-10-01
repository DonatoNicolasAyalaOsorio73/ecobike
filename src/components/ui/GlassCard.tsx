import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";

interface Props {
  children: React.ReactNode;
  /** Inner surface style (padding, alignment...). */
  style?: StyleProp<ViewStyle>;
  /** Outer box style: width/flex/margins that should size the whole card. */
  containerStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  /** Stagger delay (ms) so lists cascade in instead of popping all at once. */
  entranceDelay?: number;
}

export default function GlassCard({ children, style, containerStyle, intensity = 35, entranceDelay = 0 }: Props) {
  const { radii, shadow } = useTheme();
  return (
    <Animated.View
      // Playful but quick: drops in with a small overshoot (Duolingo feel).
      entering={FadeInDown.duration(380).delay(entranceDelay).springify().damping(13).mass(0.75)}
      style={[{ borderRadius: radii.card }, shadow, containerStyle]}
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
