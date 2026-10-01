import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import LiquidToggle from "./LiquidToggle";
import SegmentedControl from "./SegmentedControl";
import { useTheme } from "@/theme/useTheme";

interface BaseProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
}

export function SettingsSwitchRow({ icon, label, sublabel, value, onValueChange }: BaseProps & { value: boolean; onValueChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.ink} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        {sublabel && <Text style={[styles.sublabel, { color: colors.inkSoft }]}>{sublabel}</Text>}
      </View>
      <LiquidToggle value={value} onValueChange={onValueChange} />
    </View>
  );
}

export function SettingsNavRow({
  icon,
  label,
  sublabel,
  onPress,
  danger,
  showChevron = true,
}: BaseProps & { onPress: () => void; danger?: boolean; showChevron?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.ink} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.label, { color: danger ? colors.danger : colors.ink }]} numberOfLines={1}>
          {label}
        </Text>
        {sublabel && <Text style={[styles.sublabel, { color: colors.inkSoft }]}>{sublabel}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />}
    </Pressable>
  );
}

export function SettingsChoiceRow<T extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: BaseProps & { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.choiceRow}>
      <View style={styles.choiceLabelRow}>
        <Ionicons name={icon} size={18} color={colors.ink} />
        <Text style={[styles.label, { color: colors.ink, marginLeft: 12 }]}>{label}</Text>
      </View>
      {/* Same sliding-pill control the Stats period picker uses — one
          selection control in the app, so selection always looks the same. */}
      <SegmentedControl options={options} value={value} onChange={onChange} />
    </View>
  );
}

/** Numeric setting with -/+ steppers, the iOS pattern for a bounded value
 * that has no sensible fixed set of choices. */
export function SettingsStepperRow({
  icon,
  label,
  sublabel,
  value,
  onChange,
  step = 5,
  min = 5,
  max = 300,
  format,
}: BaseProps & {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const { colors } = useTheme();

  const nudge = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    if (Platform.OS !== "web") Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.ink} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
        {sublabel && <Text style={[styles.sublabel, { color: colors.inkSoft }]}>{sublabel}</Text>}
      </View>

      <View style={[styles.stepper, { borderColor: colors.glassBorder, backgroundColor: colors.glassFillStrong }]}>
        <Pressable onPress={() => nudge(-step)} disabled={value <= min} hitSlop={6} style={styles.stepperButton}>
          <Ionicons name="remove" size={16} color={value <= min ? colors.inkFaint : colors.ink} />
        </Pressable>
        <Text style={[styles.stepperValue, { color: colors.ink }]}>{format ? format(value) : value}</Text>
        <Pressable onPress={() => nudge(step)} disabled={value >= max} hitSlop={6} style={styles.stepperButton}>
          <Ionicons name="add" size={16} color={value >= max ? colors.inkFaint : colors.ink} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  label: { fontSize: 14.5, fontWeight: "600" },
  sublabel: { fontSize: 12, marginTop: 2 },
  choiceRow: { paddingVertical: 10 },
  choiceLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  stepper: { flexDirection: "row", alignItems: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 4 },
  stepperButton: { paddingHorizontal: 8, paddingVertical: 7 },
  stepperValue: { fontSize: 13, fontWeight: "800", minWidth: 52, textAlign: "center" },
});
