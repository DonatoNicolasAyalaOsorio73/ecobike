import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import Animated, { LinearTransition, FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { SPRING, projectDecay, rubberband } from "@/theme/motion";

interface Props {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** Level 1: one line, always visible. */
  compact: React.ReactNode;
  /** Level 2: full panel content. */
  children: React.ReactNode;
}

const COMMIT = 36; // px of (projected) travel that commits a collapse/expand

/**
 * Apple Maps-style map panel with two detents, so the map stays the
 * protagonist:
 *  - drag the panel down to fold it to one line, up to unfold it; it
 *    tracks the finger and rubber-bands, and a flick counts by where it
 *    was going (momentum projection), not where the finger stopped
 *  - the grabber is also a button (tap, keyboard, screen readers), so the
 *    gesture is a shortcut, never the only way
 *  - the size change animates as a layout transition, content cross-fades
 */
export default function MapSheet({ expanded, onExpandedChange, compact, children }: Props) {
  const { colors, radii } = useTheme();
  const drag = useSharedValue(0);

  const set = (next: boolean) => {
    if (next === expanded) return;
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    onExpandedChange(next);
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      // Free in the direction that changes state, resisted in the other.
      const towards = expanded ? e.translationY > 0 : e.translationY < 0;
      drag.value = towards ? e.translationY * 0.5 : rubberband(e.translationY, 120);
    })
    .onEnd((e) => {
      const travel = e.translationY + projectDecay(e.velocityY);
      if (expanded && travel > COMMIT) runOnJS(set)(false);
      else if (!expanded && travel < -COMMIT) runOnJS(set)(true);
      drag.value = withSpring(0, SPRING.momentum);
    });

  const dragStyle = useAnimatedStyle(() => ({ transform: [{ translateY: drag.value }] }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View layout={LinearTransition.springify().damping(20).mass(0.8)} style={[{ borderRadius: radii.card }, elevation("low"), dragStyle]}>
        <GlassSurface radius={radii.card} intensity={55} style={styles.inner}>
          <Pressable
            onPress={() => set(!expanded)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Contraer panel" : "Expandir panel"}
            accessibilityState={{ expanded }}
            hitSlop={10}
            style={styles.grabberHit}
          >
            <View style={[styles.grabber, { backgroundColor: colors.divider }]} />
          </Pressable>
          {expanded ? (
            <Animated.View key="full" entering={FadeIn.duration(220)}>
              {children}
            </Animated.View>
          ) : (
            <Animated.View key="compact" entering={FadeIn.duration(220)}>
              {compact}
            </Animated.View>
          )}
        </GlassSurface>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  inner: { paddingHorizontal: 20, paddingBottom: 18, paddingTop: 6 },
  grabberHit: { alignSelf: "center", paddingVertical: 6, paddingHorizontal: 24, marginBottom: 8 },
  grabber: { width: 36, height: 5, borderRadius: 3 },
});
