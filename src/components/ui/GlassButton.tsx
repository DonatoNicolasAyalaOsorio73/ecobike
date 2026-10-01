import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SPRING } from "@/theme/motion";
import { elevation } from "@/theme/colors";

interface Props {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// iOS 26 capsule button: a filled (primary) or glass (secondary) pill that
// scales down slightly under the finger and settles back critically damped.
// Same props as before, so every button in the app picks up the new feel.
const PALETTE = {
  primary: { fill: ["#B9F45F", "#9EE23C"] as const, border: "rgba(255,255,255,0.55)", text: "#15240A" },
  secondary: { fill: ["rgba(255,255,255,0.62)", "rgba(255,255,255,0.42)"] as const, border: "rgba(255,255,255,0.85)", text: "#1C2420" },
  danger: { fill: ["#FFFFFF", "#FFF6F6"] as const, border: "rgba(229,72,77,0.25)", text: "#D93036" },
  disabled: { fill: ["#EEF1EC", "#EEF1EC"] as const, border: "transparent", text: "#A2ACA4" },
} as const;

// Real backdrop blur for the glass variants on web (native gets it from the translucent fill over BlurView-backed screens).
const WEB_GLASS = Platform.OS === "web" ? ({ backdropFilter: "blur(18px) saturate(180%)", WebkitBackdropFilter: "blur(18px) saturate(180%)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)" } as object) : null;

export default function GlassButton({ label, icon, onPress, variant = "primary", disabled = false, loading = false, style }: Props) {
  const p = disabled ? PALETTE.disabled : PALETTE[variant];
  const press = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * 0.035 }], opacity: 1 - press.value * 0.12 }));

  return (
    <View style={style}>
      <Animated.View style={[styles.shadow, !disabled && elevation(variant === "primary" ? "mid" : "low"), animated]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ disabled: disabled || loading, busy: loading }}
          disabled={disabled || loading}
          onPressIn={() => {
            press.value = withSpring(1, SPRING.press);
            Haptics.selectionAsync().catch(() => {});
          }}
          onPressOut={() => (press.value = withSpring(0, SPRING.default))}
          onPress={onPress}
          style={({ hovered }: any) => [styles.face, variant !== "primary" && WEB_GLASS, { borderColor: p.border, opacity: hovered ? 0.94 : 1 }]}
        >
          <LinearGradient colors={p.fill} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
          {variant === "primary" && !disabled && (
            <LinearGradient pointerEvents="none" colors={["rgba(255,255,255,0.5)", "rgba(255,255,255,0)"]} style={styles.sheen} />
          )}
          {loading ? (
            <ActivityIndicator color={p.text} />
          ) : (
            <View style={styles.row}>
              {icon ? <Ionicons name={icon} size={18} color={p.text} /> : null}
              <Text style={[styles.label, { color: p.text }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: { borderRadius: 999 },
  face: { borderRadius: 999, borderWidth: 1, minHeight: 48, paddingHorizontal: 20, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  sheen: { position: "absolute", top: 0, left: 0, right: 0, height: "55%" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16, fontWeight: "600", letterSpacing: -0.2 },
});
