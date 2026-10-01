import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { accents, type AccentName } from "@/theme/colors";
import { SPRING } from "@/theme/motion";

export interface Choice {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface Props {
  choices: Choice[];
  value: string;
  onChange: (v: string) => void;
  accent?: AccentName;
  /** Tap the selected chip again to clear it. */
  allowClear?: boolean;
  accessibilityLabel?: string;
}

function Chip({ choice, selected, onPress, accent }: { choice: Choice; selected: boolean; onPress: () => void; accent: AccentName }) {
  const a = accents[accent];
  const scale = useSharedValue(1);
  useEffect(() => {
    if (selected) scale.value = withSequence(withSpring(0.96, SPRING.press), withSpring(1, SPRING.default));
  }, [selected, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        aria-checked={selected}
        accessibilityLabel={choice.label}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={[
          styles.chip,
          selected
            ? { backgroundColor: a.soft, borderColor: a.base }
            : { backgroundColor: "rgba(255,255,255,0.85)", borderColor: "rgba(20,40,25,0.08)" },
        ]}
      >
        {choice.icon ? <Ionicons name={choice.icon} size={16} color={selected ? a.lip : "#7A867D"} /> : null}
        <Text style={[styles.label, { color: selected ? a.lip : "#4F5B52" }]}>{choice.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Single-select capsule chips (iOS filter-chip style). */
export default function ChoiceChips({ choices, value, onChange, accent = "green", allowClear = true, accessibilityLabel }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {choices.map((c) => (
        <Chip key={c.value} choice={c} accent={accent} selected={c.value === value} onPress={() => onChange(c.value === value && allowClear ? "" : c.value)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  label: { fontSize: 14, fontWeight: "600", letterSpacing: -0.1 },
});
