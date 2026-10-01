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
    <GlassCard containerStyle={styles.card}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder },
        ]}
      >
        <Ionicons name={icon} size={18} color={accent ? colors.primaryDark : colors.ink} />
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
    borderWidth: 1,
    marginBottom: 10,
  },
  value: { fontSize: 20, fontWeight: "800" },
  label: { fontSize: 12.5, marginTop: 2 },
});
