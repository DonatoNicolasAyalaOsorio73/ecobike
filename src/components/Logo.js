import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

export default function Logo({ size = "large" }) {
  const big = size === "large";

  return (
    <View style={styles.wrap}>
      <View style={styles.markRow}>
        <MaterialCommunityIcons
          name="leaf"
          size={big ? 46 : 32}
          color={colors.primary}
          style={styles.leaf}
        />
        <Ionicons
          name="bicycle"
          size={big ? 64 : 44}
          color={colors.ink}
        />
      </View>
      <Text style={[styles.word, big ? styles.wordLarge : styles.wordSmall]}>
        <Text style={{ color: colors.primary }}>eco</Text>
        <Text style={{ color: colors.ink }}> BIKE</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  markRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  leaf: {
    marginRight: -14,
    marginBottom: 18,
    transform: [{ rotate: "-15deg" }],
  },
  word: {
    fontWeight: "800",
    letterSpacing: 6,
  },
  wordLarge: {
    fontSize: 24,
  },
  wordSmall: {
    fontSize: 18,
  },
});
