import React, { useEffect } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { useToastStore, type ToastKind } from "@/stores/toastStore";
import { SPRING } from "@/theme/motion";

const ICONS: Record<ToastKind, keyof typeof Ionicons.glyphMap> = {
  success: "checkmark-circle",
  error: "alert-circle",
  info: "information-circle",
};

/**
 * One floating glass banner for transient feedback, mounted once at the root
 * so any screen (or a service) can report completion/error without each one
 * inventing its own inline message slot.
 */
export default function ToastHost() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const message = useToastStore((s) => s.message);
  const kind = useToastStore((s) => s.kind);
  const token = useToastStore((s) => s.token);
  const hide = useToastStore((s) => s.hide);

  const progress = useSharedValue(0);
  const visible = Boolean(message);

  useEffect(() => {
    progress.value = withSpring(visible ? 1 : 0, visible ? SPRING.bouncy : SPRING.default);
    if (visible && Platform.OS !== "web") {
      Haptics.notificationAsync(
        kind === "error"
          ? Haptics.NotificationFeedbackType.Error
          : kind === "success"
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning
      );
    }
    // `token` is in the deps so an identical repeated message still re-fires.
  }, [visible, token, kind, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -40 }, { scale: 0.9 + progress.value * 0.1 }],
  }));

  if (!message) return null;

  const accent = kind === "error" ? colors.danger : kind === "success" ? colors.success : colors.info;

  return (
    <Animated.View style={[styles.wrap, { top: insets.top + 8 }, style]}>
      <Pressable onPress={hide} style={{ width: "100%" }} accessibilityRole="alert" accessibilityLiveRegion="polite" accessibilityLabel={message}>
        <GlassSurface
          radius={999}
          intensity={60}
          backgroundColor={colors.glassFillStrong}
          borderColor={accent}
          style={styles.pill}
        >
          <View style={[styles.iconDot, { backgroundColor: accent }]}>
            <Ionicons name={ICONS[kind]} size={16} color={kind === "success" ? colors.primaryDark : "#FFFFFF"} />
          </View>
          <Text style={[styles.text, { color: colors.ink }]} numberOfLines={2}>
            {message}
          </Text>
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 60 },
  pill: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 8, paddingRight: 16, paddingVertical: 8, width: "100%", borderWidth: 2 },
  iconDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  text: { fontSize: 13.5, fontWeight: "700", flex: 1 },
});
