import React from "react";
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";

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
      backgroundColor={colors.glassFillStrong}
      style={[styles.track, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.pill,
          {
            width: `${100 / options.length}%`,
            backgroundColor: colors.glassGreenFill,
            borderColor: colors.glassGreenBorder,
          },
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
            style={styles.segment}
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
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  // Vertical padding only: a horizontal inset would make the pill's
  // percentage width resolve against a box wider than the segments.
  track: { flexDirection: "row", paddingVertical: 4 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 999, zIndex: 2 },
  pill: { position: "absolute", top: 4, bottom: 4, left: 0, borderRadius: 999, borderWidth: 1 },
  label: { fontSize: 12.5 },
});
