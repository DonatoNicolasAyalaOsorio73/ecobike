import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";
import { elevation } from "@/theme/colors";

interface Props<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * iOS-style segmented control: one pill that *slides* between segments
 * instead of each segment drawing its own highlight. The slide is what
 * communicates "same control, different selection" — a cross-fade between
 * two static highlights reads as two unrelated states.
 *
 * Geometry is expressed entirely in percentages, with no measurement at all:
 *  - the pill is `100 / options.length` percent wide, i.e. exactly one
 *    segment, resolved against the track by the layout engine
 *  - `translateX` is a percentage of the pill's *own* width, so moving it
 *    `n * 100%` lands it precisely on segment n
 *
 * This matters beyond elegance: `onLayout` never fired in a production web
 * build here (it did in dev), which left every measurement-driven pill at
 * width 0 — invisible. Percentages can't go stale, can't arrive late, and
 * stay a compositor-friendly transform.
 */
export default function SegmentedControl<T extends string>({ options, value, onChange, style }: Props<T>) {
  const { colors, radii } = useTheme();
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const progress = useSharedValue(selectedIndex);

  React.useEffect(() => {
    progress.value = withSpring(selectedIndex, SPRING.default);
  }, [selectedIndex, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${progress.value * 100}%` }],
  }));

  return (
    <GlassSurface
      radius={radii.pill}
      intensity={40}
      specular={false}
      backgroundColor="rgba(40,110,55,0.08)"
      style={style}
    >
      <View style={styles.track} role="tablist">
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          { width: `${100 / options.length}%` },
          elevation("low"),
          pillStyle,
        ]}
      />

      {options.map((option, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onChange(option.value);
            }}
            style={({ pressed }) => [styles.segment, { opacity: pressed && !selected ? 0.6 : 1 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { color: selected ? colors.primaryDark : colors.inkSoft, fontWeight: selected ? "800" : "600" },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  // Inset row (margin, not padding) so the pill's percentages resolve
  // against exactly the segments AND the pill never touches — and gets
  // clipped by — the capsule's rounded ends.
  track: { flexDirection: "row", margin: 3 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 999, zIndex: 2 },
  pill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  label: { fontSize: 12.5 },
});
