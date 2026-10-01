import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

const SPRING = { damping: 18, stiffness: 220 };

/**
 * Floating "sin conexión" pill, same idea as Uber/DiDi's persistent offline
 * indicator — local ride tracking keeps working, but this makes it obvious
 * why sync/social features aren't updating right now.
 */
export default function OfflineBanner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isConnected = useNetworkStatus();
  const offline = isConnected === false;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(offline ? 1 : 0, SPRING);
  }, [offline, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -40 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      // Stays mounted so it can animate both ways, but an opacity-0 banner
      // must not still be readable by a screen reader — otherwise it
      // announces "sin conexión" to someone who is perfectly online.
      accessibilityElementsHidden={!offline}
      importantForAccessibility={offline ? "yes" : "no-hide-descendants"}
      style={[styles.wrap, { top: insets.top + 8 }, style]}
    >
      <GlassSurface radius={999} intensity={60} backgroundColor="rgba(229,72,77,0.16)" borderColor={colors.danger} style={styles.pill}>
        <Ionicons name="cloud-offline-outline" size={14} color={colors.danger} />
        <Text style={[styles.text, { color: colors.danger }]}>Sin conexión — tus recorridos se guardan localmente</Text>
      </GlassSurface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 50 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  text: { fontSize: 11.5, fontWeight: "700", flexShrink: 1 },
});
