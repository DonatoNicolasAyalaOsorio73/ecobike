import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import GlassCard from "./GlassCard";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: boolean;
}

export default function StatTile({ icon, label, value, accent }: Props) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.card}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder },
        ]}
      >
        <Ionicons name={icon} size={18} color={accent ? colors.primaryDark : colors.ink} />
      </View>
      <Text style={[styles.value, { color: colors.ink }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.inkSoft }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 10,
  },
  value: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 12.5, marginTop: 2 },
});
