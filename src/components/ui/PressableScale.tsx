import React from "react";
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SPRING } from "@/theme/motion";

interface Props extends Omit<PressableProps, "style" | "children"> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** How far it sinks under the finger (cards: subtle, tiles: a bit more). */
  depth?: number;
  haptic?: boolean;
}

/**
 * Press feedback for anything tappable that isn't a button: sinks under
 * the finger (UI-thread spring, lands with the touch), springs back on
 * release, light haptic on native, gentle lift on hover for pointers.
 */
export default function PressableScale({ children, style, depth = 0.03, haptic = true, onPressIn, onPressOut, ...rest }: Props) {
  const press = useSharedValue(0);
  const hover = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * depth + hover.value * 0.01 }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        press.value = withSpring(1, SPRING.press);
        if (haptic && Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        press.value = withSpring(0, SPRING.momentum);
        onPressOut?.(e);
      }}
      onHoverIn={() => (hover.value = withSpring(1, SPRING.default))}
      onHoverOut={() => (hover.value = withSpring(0, SPRING.default))}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}
