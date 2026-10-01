import React, { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";
import { seededRandom } from "@/utils/random";

const COLORS = ["#ADF14B", "#C3F57A", "#D8FBA6", "#9EE23C", "#E9FBCB", "#FFFFFF"];

function Piece({ x, delay, rotate, color, drift }: { x: number; delay: number; rotate: number; color: string; drift: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.9,
    transform: [{ translateY: -20 + t.value * 380 }, { translateX: drift * t.value }, { rotate: `${rotate * t.value}deg` }],
  }));
  return <Animated.View style={[styles.piece, { left: `${x}%`, backgroundColor: color }, style]} />;
}

/** One-shot celebratory burst (ride completed, goal reached). Purely decorative. */
export default function Confetti({ count = 28 }: { count?: number }) {
  const pieces = useMemo(() => {
    const r = seededRandom(7);
    return Array.from({ length: count }, (_, i) => ({
      x: r() * 100,
      delay: r() * 250,
      rotate: (r() - 0.5) * 720,
      drift: (r() - 0.5) * 80,
      color: COLORS[i % COLORS.length],
    }));
  }, [count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {pieces.map((p, i) => (
        <Piece key={i} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  piece: { position: "absolute", top: 0, width: 8, height: 12, borderRadius: 2 },
});
