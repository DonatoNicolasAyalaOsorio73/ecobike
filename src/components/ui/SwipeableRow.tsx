import React from "react";
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { SPRING, projectDecay, rubberband } from "@/theme/motion";

interface Props {
  children: React.ReactNode;
  onDelete: () => void;
  /** Width of the revealed action area. */
  actionWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fraction of the action width past which a release commits to open. */
const OPEN_THRESHOLD = 0.5;

/**
 * Swipe-left-to-delete with the gesture details that separate "fluid" from
 * "fine" (Designing Fluid Interfaces):
 *  - the row tracks the finger 1:1 while dragging, not only on release
 *  - dragging the wrong way rubber-bands instead of hard-stopping
 *  - the release decision uses *projected* momentum, so a fast flick opens
 *    even from a short drag, and a slow drag past halfway opens too
 *  - the release velocity is handed to the spring, so there's no visible
 *    seam between dragging and animating
 */
export default function SwipeableRow({ children, onDelete, actionWidth = 88, style }: Props) {
  const { colors, radii } = useTheme();
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const haptic = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const pan = Gesture.Pan()
    // Only claim the gesture once it's clearly horizontal, so a vertical
    // list scroll still wins — competing recognizers resolved by intent.
    .activeOffsetX([-12, 12])
    .failOffsetY([-14, 14])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      if (next > 0) {
        // Past the closed boundary (dragging right): resist progressively.
        translateX.value = rubberband(next, actionWidth);
      } else if (next < -actionWidth) {
        const overshoot = next + actionWidth;
        translateX.value = -actionWidth + rubberband(overshoot, actionWidth);
      } else {
        translateX.value = next;
      }
    })
    .onEnd((e) => {
      // Snap to where the gesture was *going*, not where the finger stopped.
      const projected = translateX.value + projectDecay(e.velocityX);
      const shouldOpen = projected < -actionWidth * OPEN_THRESHOLD;
      const target = shouldOpen ? -actionWidth : 0;
      if (shouldOpen) runOnJS(haptic)();
      translateX.value = withSpring(target, { ...SPRING.momentum, velocity: e.velocityX });
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  // The action fades/scales in as the row uncovers it, so the intermediate
  // frames telegraph the outcome instead of revealing a static block.
  const actionStyle = useAnimatedStyle(() => {
    const revealed = Math.min(1, Math.max(0, -translateX.value / actionWidth));
    return { opacity: revealed, transform: [{ scale: 0.8 + revealed * 0.2 }] };
  });

  const close = () => {
    translateX.value = withSpring(0, SPRING.default);
  };

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        style={[
          styles.actionArea,
          { width: actionWidth, backgroundColor: colors.danger, borderRadius: radii.card },
          actionStyle,
        ]}
      >
        <Animated.View>
          <Text
            accessibilityRole="button"
            onPress={() => {
              close();
              onDelete();
            }}
            style={styles.actionLabel}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </Text>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative", justifyContent: "center" },
  actionArea: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { padding: 12 },
});
