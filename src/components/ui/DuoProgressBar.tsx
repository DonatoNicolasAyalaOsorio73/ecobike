import React, { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { accents, type AccentName } from "@/theme/colors";
import { SPRING } from "@/theme/motion";

interface Props {
  /** 0..1 */
  value: number;
  accent?: AccentName;
  height?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Slim rounded progress bar (iOS style) that eases to its value. */
export default function DuoProgressBar({ value, accent = "green", height = 8, delay = 0, style }: Props) {
  const v = Math.max(0, Math.min(1, value));
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withSpring(v, SPRING.default));
  }, [v, delay, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const a = accents[accent];

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
    >
      <Animated.View style={[styles.fill, { borderRadius: height / 2, backgroundColor: a.base, minWidth: v > 0 ? height : 0 }, fill]}>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: "rgba(40,110,55,0.1)", overflow: "hidden" },
  fill: { height: "100%" },
});
