import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import GlassCard from "./GlassCard";
import { accents, type AccentName } from "@/theme/colors";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Kept for compatibility; color now comes from `color` or the icon. */
  accent?: boolean;
  color?: AccentName;
}

// Each metric gets its own color (Duolingo-style), derived from its icon.
const ICON_ACCENT: Partial<Record<string, AccentName>> = {
  "speedometer-outline": "blue",
  "time-outline": "purple",
  "flash-outline": "gold",
  "trending-up-outline": "orange",
  "triangle-outline": "teal",
  "flame-outline": "orange",
  "calendar-outline": "blue",
  "bonfire-outline": "orange",
  "bicycle-outline": "green",
  "leaf-outline": "green",
};

export default function StatTile({ icon, label, value, color }: Props) {
  const { colors } = useTheme();
  const a = accents[color ?? ICON_ACCENT[icon] ?? "green"];
  return (
    <GlassCard containerStyle={styles.card}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: a.soft, borderColor: a.base },
        ]}
      >
        <Ionicons name={icon} size={18} color={a.lip} />
      </View>
      <Text style={[styles.value, { color: colors.ink }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.inkSoft }]} numberOfLines={2}>
        {label}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  // Two equal columns that always fill the row (gap 12 between them).
  card: { flexBasis: "46%", flexGrow: 1 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 10,
  },
  value: { fontSize: 20, fontWeight: "700" },
  label: { fontSize: 12.5, marginTop: 2 },
});
