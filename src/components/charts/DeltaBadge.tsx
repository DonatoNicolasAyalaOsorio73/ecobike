import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

/** "+12%" / "-8%" pill vs. the previous period; renders nothing without a baseline. */
export default function DeltaBadge({ pct }: { pct: number | null | undefined }) {
  const { colors } = useTheme();
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null;
  const up = pct >= 0;
  const color = up ? colors.success : colors.danger;
  const value = Math.abs(Math.round(pct));
  return (
    <View style={[styles.pill, { borderColor: color }]} accessibilityLabel={`${up ? "Sube" : "Baja"} ${value} por ciento`}>
      <Ionicons name={up ? "arrow-up" : "arrow-down"} size={11} color={color} />
      <Text style={[styles.text, { color }]}>{value}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 2, borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  text: { fontSize: 11, fontWeight: "800" },
});
