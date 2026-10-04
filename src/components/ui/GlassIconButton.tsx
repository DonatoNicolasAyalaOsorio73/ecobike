import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";
import { elevation } from "@/theme/colors";
import { LIQUID_BORDER, LIQUID_FILL, LIQUID_RIM } from "@/theme/glass";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  active?: boolean;
  /** Clear Liquid Glass (tab-bar material) instead of the default frosted fill. For controls floating over the map. */
  liquid?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Round Liquid Glass control: squishes under the finger and springs back, with a light haptic. */
export default function GlassIconButton({ icon, onPress, accessibilityLabel, size = 48, active, liquid, style }: Props) {
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
      <Animated.View style={[{ borderRadius: size / 2 }, elevation("low"), animated]}>
        <GlassSurface
          radius={size / 2}
          intensity={liquid ? 100 : 55}
          specular={liquid}
          backgroundColor={active ? colors.primary : liquid ? LIQUID_FILL : colors.glassFillStrong}
          borderColor={active ? colors.primaryDark : liquid ? LIQUID_BORDER : colors.glassBorder}
          style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, liquid && LIQUID_RIM]}
        >
          <Ionicons name={icon} size={size * 0.45} color={active ? colors.onPrimary : colors.ink} />
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}
