import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

/** "Recording" indicator: a solid dot with an expanding, fading halo. */
export default function PulseDot({ color, size = 10, active = true }: { color: string; size?: number; active?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = active ? withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false) : 0;
  }, [active, t]);
  const halo = useAnimatedStyle(() => ({ opacity: active ? 0.6 * (1 - t.value) : 0, transform: [{ scale: 1 + t.value * 1.8 }] }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color }, halo]} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
