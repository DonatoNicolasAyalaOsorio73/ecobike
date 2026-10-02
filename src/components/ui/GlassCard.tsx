import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import Reveal from "./Reveal";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { enter } from "@/theme/motion";

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

/**
 * Every card moves the same way: it enters with the shared emphasized curve
 * when the screen opens, and inside a scrolling screen it also reveals as it
 * scrolls into view (Reveal). Layout styles live on the outer wrapper so the
 * animated layers never fight over size or opacity.
 */
export default function GlassCard({ children, style, containerStyle, intensity = 35, entranceDelay = 0 }: Props) {
  const { radii } = useTheme();
  return (
    <Reveal style={containerStyle}>
      <Animated.View entering={enter(entranceDelay)} style={[styles.fill, { borderRadius: radii.card }, elevation("low")]}>
        <GlassSurface radius={radii.card} intensity={intensity} style={[styles.inner, style]}>
          {children}
        </GlassSurface>
      </Animated.View>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  fill: { flexGrow: 1 },
  inner: { padding: 20, flexGrow: 1 },
});
