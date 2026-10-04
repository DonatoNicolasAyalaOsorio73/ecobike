import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";

export default function BackButton({ onPress, size = 44 }: { onPress?: () => void; size?: number }) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2 }, animatedStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={8}
        // Deep links / reloads have no history: fall back to home.
        onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace("/")))}
        onPressIn={() => (scale.value = withSpring(0.9, { damping: 16, stiffness: 380 }))}
        onPressOut={() => (scale.value = withSpring(1, { damping: 16, stiffness: 380 }))}
        style={StyleSheet.absoluteFill}
      >
        <GlassSurface
          radius={size / 2}
          intensity={45}
          specular={false}
          backgroundColor={colors.glassFillStrong}
          borderColor={colors.glassBorder}
          style={styles.inner}
        >
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 44, height: 44, borderRadius: 22 },
  inner: { flex: 1, alignItems: "center", justifyContent: "center" },
});
