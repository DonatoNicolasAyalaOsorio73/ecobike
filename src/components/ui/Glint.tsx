import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

/**
 * Light on Liquid Glass edges. iOS 26 glass catches light along its rim;
 * this animates that highlight so the control reads as a lens.
 * Decorative, non-interactive and off with "reduce motion".
 */

/** A soft band of light that sweeps across a glass surface every few seconds. */
export function ShineSweep({ width, every = 6000 }: { width: number; every?: number }) {
  const still = useReducedMotion();
  const t = useSharedValue(-1);
  useEffect(() => {
    if (still) return;
    t.value = withDelay(1500, withRepeat(withSequence(withTiming(1.2, { duration: 1100, easing: Easing.inOut(Easing.cubic) }), withTiming(1.2, { duration: every }), withTiming(-1, { duration: 0 })), -1));
  }, [t, still, every]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: t.value * width }, { rotate: "20deg" }] }));
  if (still) return null;
  return (
    <Animated.View pointerEvents="none" style={[styles.band, style]}>
      <LinearGradient colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  ring: { position: "absolute" },
  band: { position: "absolute", top: -30, bottom: -30, left: -50, width: 44 },
});

