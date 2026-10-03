import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/useTheme";
import { useTweenedValue } from "@/hooks/useTweenedValue";

interface Props {
  /** 0–1. Values above 1 are kept (goal exceeded) but the arc caps at full. */
  progress: number;
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
  /** Unfilled track color (default: hairline divider). */
  trackColor?: string;
}

/**
 * Apple Fitness-style goal ring. The arc sweeps to its new value instead of
 * jumping, which is what makes progress feel earned rather than reported.
 */
export default function ProgressRing({ progress, size = 120, thickness = 12, children, trackColor }: Props) {
  const { colors } = useTheme();
  const animated = useTweenedValue(Math.min(1, Math.max(0, progress)), 0.8);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animated);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Array form: react-native-svg's style prop types require an iterable. */}
      <Svg width={size} height={size} style={[styles.svg]}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? colors.divider}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.primary}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeOpacity={animated > 0.001 ? 1 : 0}
          strokeDasharray={`${circumference - dashOffset} ${circumference}`}
          // Start the sweep at 12 o'clock (like iOS rings) by shifting the dash
          // a quarter turn instead of an SVG rotate transform, which react-native-svg
          // turns into an invalid `transform-origin` DOM attribute on web.
          strokeDashoffset={circumference / 4}
        />
      </Svg>
      <View style={styles.center}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: { position: "absolute", top: 0, left: 0 },
  center: { alignItems: "center", justifyContent: "center" },
});
