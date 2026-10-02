import React, { useEffect } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { SPRING } from "@/theme/motion";

const LOGO = require("../../../assets/logo.png");

/**
 * Brand mark with presence: the PNG carries ~15% transparent padding, so the
 * visible wordmark is sized up to compensate, and a soft green halo sits
 * behind it so it reads as the hero of the screen, not a stray image.
 * Enters with a critically damped scale/fade; the halo then breathes slowly.
 */
export default function Logo({ size = "large", animateIn = true }: { /** Named size or exact width in pt. */ size?: "large" | "small" | number; /** false on splash/lock screens: the JS thread is busy there, so an entrance could stall invisible. */ animateIn?: boolean }) {
  const dimension = typeof size === "number" ? size : size === "large" ? 220 : 168;
  const enter = useSharedValue(animateIn ? 0 : 1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (animateIn) enter.value = withSpring(1, SPRING.default);
    glow.value = withDelay(
      500,
      withRepeat(withSequence(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) })), -1)
    );
  }, [enter, glow, animateIn]);

  const markStyle = useAnimatedStyle(() => ({ opacity: enter.value, transform: [{ scale: 0.9 + 0.1 * enter.value }] }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: enter.value * (0.55 + 0.25 * glow.value), transform: [{ scale: 0.96 + 0.06 * glow.value }] }));

  return (
    <View style={{ width: dimension, height: dimension * 0.78, alignItems: "center", justifyContent: "center" }}>
      <Animated.View pointerEvents="none" style={[styles.halo, { width: dimension * 0.9, height: dimension * 0.62, borderRadius: dimension }, haloStyle]}>
        <LinearGradient colors={["rgba(173,241,75,0.45)", "rgba(173,241,75,0)"]} start={{ x: 0.5, y: 0.5 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={markStyle}>
        <Image source={LOGO} style={{ width: dimension, height: dimension }} resizeMode="contain" accessibilityLabel="EcoBike" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Web gets a true soft glow via CSS blur; native keeps a faint ellipse (no blur filter on iOS).
  halo: { position: "absolute", overflow: "hidden", backgroundColor: Platform.OS === "web" ? "rgba(190,240,120,0.55)" : "rgba(216,251,166,0.3)", ...(Platform.OS === "web" ? ({ filter: "blur(28px)" } as object) : {}) },
});
