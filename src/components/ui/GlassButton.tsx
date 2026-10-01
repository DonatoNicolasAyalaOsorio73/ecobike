import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Matches the spring UIKit uses for its default button press feedback
// (damping ~16, stiffness ~380) rather than a linear/timing fade — this is
// what makes a press feel "native iOS" instead of "web app with a tap state".
const PRESS_SPRING = { damping: 16, stiffness: 380, mass: 0.6 };

export default function GlassButton({
  label,
  icon,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}: Props) {
  const { colors, radii, glowShadow, isDark } = useTheme();
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    if (disabled || loading) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[{ borderRadius: radii.pill }, isPrimary && !disabled && glowShadow, animatedStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => (scale.value = withSpring(0.96, PRESS_SPRING))}
        onPressOut={() => (scale.value = withSpring(1, PRESS_SPRING))}
        disabled={disabled || loading}
        style={[{ borderRadius: radii.pill, overflow: "hidden" }, disabled ? { opacity: 0.55 } : null]}
      >
        {isPrimary ? (
          <LinearGradient
            colors={[colors.primaryLight, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.inner, { borderColor: colors.glassBorder, borderWidth: 1 }]}
          >
            <Content icon={icon} label={label} textColor={colors.onPrimary} loading={loading} />
          </LinearGradient>
        ) : (
          <GlassSurface
            radius={radii.pill}
            intensity={45}
            specular={false}
            borderColor={isDanger ? colors.danger : colors.glassBorder}
            backgroundColor={isDanger ? "rgba(229,72,77,0.12)" : colors.glassFillStrong}
            style={styles.inner}
          >
            <Content icon={icon} label={label} textColor={isDanger ? colors.danger : colors.ink} loading={loading} />
          </GlassSurface>
        )}
      </Pressable>
    </Animated.View>
  );
}

function Content({
  icon,
  label,
  textColor,
  loading,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  textColor: string;
  loading: boolean;
}) {
  if (loading) return <ActivityIndicator color={textColor} />;
  return (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={18} color={textColor} style={{ marginRight: 2 }} /> : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16, fontWeight: "700" },
});
