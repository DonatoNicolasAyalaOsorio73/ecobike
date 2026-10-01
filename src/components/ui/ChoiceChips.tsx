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
    if (selected) scale.value = withSequence(withSpring(1.12, SPRING.press), withSpring(1, SPRING.bouncy));
  }, [selected, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={choice.label}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        style={[
          styles.chip,
          selected
            ? { backgroundColor: a.soft, borderColor: a.base, borderBottomColor: a.lip }
            : { backgroundColor: "#FFFFFF", borderColor: "#E3E7E1", borderBottomColor: "#D5DBD2" },
        ]}
      >
        {choice.icon ? <Ionicons name={choice.icon} size={16} color={selected ? a.lip : "#7A867D"} /> : null}
        <Text style={[styles.label, { color: selected ? a.lip : "#4F5B52" }]}>{choice.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Single-select chips with a 3D bottom edge and a pop on selection. */
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
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 14, borderWidth: 2, borderBottomWidth: 4 },
  label: { fontSize: 13.5, fontWeight: "800" },
});
