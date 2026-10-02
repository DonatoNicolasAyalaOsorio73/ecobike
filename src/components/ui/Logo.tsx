import React, { useEffect } from "react";
import { Image, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SPRING } from "@/theme/motion";

const LOGO = require("../../../assets/logo.png");

/**
 * Brand mark. The PNG carries ~15% transparent padding, so the visible
 * wordmark is sized up to compensate. No halo: the mark carries the color;
 * presence comes from its entrance (rises and settles with a soft spring).
 */
export default function Logo({ size = "large", animateIn = true }: { /** Named size or exact width in pt. */ size?: "large" | "small" | number; /** false on splash/lock screens: the JS thread is busy there, so an entrance could stall invisible. */ animateIn?: boolean }) {
  const dimension = typeof size === "number" ? size : size === "large" ? 220 : 168;
  const enter = useSharedValue(animateIn ? 0 : 1);

  useEffect(() => {
    if (animateIn) enter.value = withSpring(1, SPRING.bouncy);
  }, [enter, animateIn]);

  const markStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, enter.value * 1.4),
    transform: [{ translateY: (1 - enter.value) * 14 }, { scale: 0.92 + 0.08 * enter.value }],
  }));

  return (
    <View style={{ width: dimension, height: dimension * 0.78, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={markStyle}>
        <Image source={LOGO} style={{ width: dimension, height: dimension }} resizeMode="contain" accessibilityLabel="EcoBike" />
      </Animated.View>
    </View>
  );
}
