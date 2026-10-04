import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import Animated, { Easing, cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";

const HOLD_MS = 900;

/**
 * Press and hold to confirm: the button fills with lime while you hold and
 * fires when full; letting go early springs it back. One deliberate gesture
 * instead of a two-step "are you sure?" dialog. Screen-reader users (for whom
 * holding is awkward) confirm with a normal activation.
 */
export default function HoldToConfirm({ label, onConfirm, loading, disabled }: { label: string; onConfirm: () => void; loading?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  const fill = useSharedValue(0);
  const [screenReader, setScreenReader] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setScreenReader).catch(() => {});
    // VoiceOver/TalkBack can be switched on while the sheet is open.
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReader);
    return () => sub.remove();
  }, []);

  // When the action finishes (e.g. a failed redeem), drain the fill and allow
  // another attempt; otherwise the button stays lime and retries are ignored.
  useEffect(() => {
    if (loading) return;
    fired.current = false;
    fill.value = withSpring(0, SPRING.default);
  }, [loading, disabled, fill]);

  const fire = () => {
    if (fired.current) return;
    fired.current = true;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onConfirm();
  };

  const start = () => {
    if (disabled || loading || screenReader) return;
    fired.current = false;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    fill.value = withTiming(1, { duration: HOLD_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) runOnJS(fire)();
    });
  };
  const cancel = () => {
    if (fired.current) return;
    cancelAnimation(fill);
    fill.value = withSpring(0, SPRING.default);
  };

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const squeeze = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.03 * Math.min(1, fill.value * 4) }] }));

  return (
    <Animated.View style={squeeze}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={screenReader ? "Toca dos veces para confirmar" : "Mantén presionado para confirmar"}
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        disabled={disabled || loading}
        onPressIn={start}
        onPressOut={cancel}
        onPress={screenReader ? fire : undefined}
        style={[styles.btn, { backgroundColor: disabled ? "#EEF1EC" : "rgba(20,23,26,0.06)" }]}
      >
        <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: colors.primary }, fillStyle]} />
        <View style={styles.row} pointerEvents="none">
          <Ionicons name={loading ? "hourglass-outline" : "finger-print"} size={20} color={disabled ? "#A2ACA4" : colors.ink} />
          <Text style={[styles.label, { color: disabled ? "#A2ACA4" : colors.ink }]}>{loading ? "Un momento…" : label}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: { height: 56, borderRadius: 999, overflow: "hidden", justifyContent: "center" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  label: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
});
