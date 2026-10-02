import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import GlassCard from "./GlassCard";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}

// The number is the content; the icon is a quiet label (neutral, no accent).
export default function StatTile({ icon, label, value }: Props) {
  const { colors } = useTheme();
  return (
    <GlassCard containerStyle={styles.card}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.chipFill },
        ]}
      >
        <Ionicons name={icon} size={18} color={colors.ink} />
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
    marginBottom: 10,
  },
  value: { fontSize: 20, fontWeight: "700" },
  label: { fontSize: 12.5, marginTop: 2 },
});
