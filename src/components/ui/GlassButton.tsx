import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SPRING } from "@/theme/motion";

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Duolingo-style "chunky" 3D button: a solid face sitting on a darker lip.
// Pressing pushes the face down onto the lip; releasing springs it back up
// with a little bounce. Same props as before, so every button in the app
// picks up the new feel.
const LIP = 4;
const RADIUS = 16;

const PALETTE = {
  primary: { face: "#ADF14B", lip: "#7CB82F", border: "#9BDD3F", text: "#1F3A0B" },
  secondary: { face: "#FFFFFF", lip: "#D5DDD2", border: "#E2E8E0", text: "#3C4A3F" },
  danger: { face: "#FF5A5F", lip: "#D33A3F", border: "#FF5A5F", text: "#FFFFFF" },
  disabled: { face: "#EEF1EC", lip: "#D9DED6", border: "#E2E6DF", text: "#A2ACA4" },
} as const;

export default function GlassButton({ label, icon, onPress, variant = "primary", disabled = false, loading = false, style }: Props) {
  const p = disabled ? PALETTE.disabled : PALETTE[variant];
  const press = useSharedValue(0);

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateY: press.value * LIP }] }));

  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        disabled={disabled || loading}
        onPressIn={() => {
          press.value = withSpring(1, SPRING.press);
          Haptics.selectionAsync().catch(() => {});
        }}
        onPressOut={() => (press.value = withSpring(0, SPRING.bouncy))}
        onPress={onPress}
        style={[styles.lip, { backgroundColor: p.lip }]}
      >
        <Animated.View style={[styles.face, { backgroundColor: p.face, borderColor: p.border }, faceStyle]}>
          {variant !== "secondary" && !disabled && <View pointerEvents="none" style={styles.shine} />}
          {loading ? (
            <ActivityIndicator color={p.text} />
          ) : (
            <View style={styles.row}>
              {icon ? <Ionicons name={icon} size={19} color={p.text} /> : null}
              <Text style={[styles.label, { color: p.text }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lip: { borderRadius: RADIUS, paddingBottom: LIP },
  face: { borderRadius: RADIUS, borderWidth: 2, minHeight: 50, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  shine: { position: "absolute", top: 5, left: 14, right: 14, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.45)" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16, fontWeight: "800", letterSpacing: 0.2 },
});
