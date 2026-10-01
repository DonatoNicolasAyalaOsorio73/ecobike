import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "@/theme/useTheme";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Donut with a legend of percentages; the center shows the total. */
export default function DonutChart({
  slices,
  size = 130,
  thickness = 18,
  centerLabel,
}: {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel: string;
}) {
  const { colors } = useTheme();
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <View style={styles.row} accessible accessibilityLabel={slices.map((s) => `${s.label}: ${s.value}`).join(", ")}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.divider} strokeWidth={thickness} fill="none" />
            {total > 0 &&
              slices.map((s) => {
                const len = (s.value / total) * c;
                const el = (
                  <Circle
                    key={s.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    stroke={s.color}
                    strokeWidth={thickness}
                    fill="none"
                    strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                    strokeDashoffset={c / 4 - offset} // start at 12 o'clock without an SVG transform (web-safe)
                  />
                );
                offset += len;
                return el;
              })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.total, { color: colors.ink }]}>{total}</Text>
          <Text style={{ color: colors.inkSoft, fontSize: 11 }}>{centerLabel}</Text>
        </View>
      </View>
      <View style={styles.legend}>
        {slices.map((s) => (
          <View key={s.label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={{ color: colors.inkSoft, flex: 1, fontSize: 12 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {s.label}
            </Text>
            <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13 }}>
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  center: { alignItems: "center", justifyContent: "center" },
  total: { fontSize: 24, fontWeight: "700" },
  legend: { flex: 1, gap: 10 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
