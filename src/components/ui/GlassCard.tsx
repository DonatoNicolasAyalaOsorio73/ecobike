import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";

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
  const { radii } = useTheme();
  return (
    <Animated.View
      // Rises into place, nearly critically damped: settles without a visible bounce.
      entering={FadeInDown.duration(380).delay(entranceDelay).springify().damping(18).mass(0.8)}
      style={[{ borderRadius: radii.card }, elevation("low"), containerStyle]}
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
