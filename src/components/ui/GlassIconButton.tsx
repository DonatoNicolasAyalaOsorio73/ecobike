import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Round Liquid Glass control: squishes under the finger and springs back, with a light haptic. */
export default function GlassIconButton({ icon, onPress, accessibilityLabel, size = 48, active, style }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active }}
      hitSlop={6}
      onPressIn={() => (scale.value = withSpring(0.88, SPRING.press))}
      onPressOut={() => (scale.value = withSpring(1, SPRING.momentum))}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={style}
    >
      <Animated.View style={animated}>
        <GlassSurface
          radius={size / 2}
          intensity={55}
          backgroundColor={active ? colors.primary : colors.glassFillStrong}
          borderColor={active ? colors.primaryDark : colors.glassBorder}
          style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name={icon} size={size * 0.45} color={active ? colors.onPrimary : colors.ink} />
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}
