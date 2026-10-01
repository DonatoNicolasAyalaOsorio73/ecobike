import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";

const WIDTH = 50;
const HEIGHT = 30;
const THUMB = 26;
const PADDING = 2;

/**
 * A custom toggle instead of RN's <Switch> — the native web <Switch> renders
 * as a browser/OS control and ignores trackColor's "on" state in some
 * browsers (shows the OS accent color instead of the brand green), breaking
 * mobile/web visual parity. This one is pixel-identical everywhere.
 */
export default function LiquidToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, { damping: 16, stiffness: 260 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.divider, colors.primary]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * (WIDTH - THUMB - PADDING * 2) }],
  }));

  return (
    <Pressable onPress={() => onValueChange(!value)} hitSlop={8}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, padding: PADDING, justifyContent: "center" },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#FFFFFF",
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 1px 2px rgba(0,0,0,0.2)" }
      : { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 }),
  } as const,
});
