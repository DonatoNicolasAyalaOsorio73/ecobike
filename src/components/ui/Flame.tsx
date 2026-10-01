import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { accents } from "@/theme/colors";

/** Streak flame: flickers (scale + sway) while the streak is alive, gray and still when it isn't. */
export default function Flame({ size = 28, lit = true }: { size?: number; lit?: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = lit
      ? withRepeat(
          withSequence(withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) })),
          -1
        )
      : 0;
  }, [lit, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + t.value * 0.08 }, { scaleX: 1 - t.value * 0.04 }, { rotate: `${(t.value - 0.5) * 6}deg` }],
  }));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "flex-end" }}>
      <Animated.View style={style}>
        <Ionicons name="flame" size={size} color={lit ? accents.orange.base : "#C9CFC8"} />
      </Animated.View>
    </View>
  );
}
