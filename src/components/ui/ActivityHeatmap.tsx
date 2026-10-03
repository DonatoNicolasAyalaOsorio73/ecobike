import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import type { HeatmapCell } from "@/domain/rideStats";

interface Props {
  cells: HeatmapCell[];
  /** Cells run top-to-bottom within a column, so a column is one week. */
  rows?: number;
}

const DAY_LABELS = ["L", "", "X", "", "V", "", "D"];

/** Opacity per activity level — one hue, five weights, so the grid reads as
 * intensity rather than as five unrelated colours. */
const LEVEL_OPACITY = [0, 0.25, 0.45, 0.7, 1] as const;

export default function ActivityHeatmap({ cells, rows = 7 }: Props) {
  const { colors } = useTheme();

  const columns: HeatmapCell[][] = [];
  for (let i = 0; i < cells.length; i += rows) {
    columns.push(cells.slice(i, i + rows));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.dayLabels}>
        {DAY_LABELS.slice(0, rows).map((label, i) => (
          <Text key={i} style={[styles.dayLabel, { color: colors.inkFaint }]}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {columns.map((column, ci) => (
          <View key={ci} style={styles.column}>
            {column.map((cell) => (
              <Animated.View
                key={cell.date}
                entering={FadeIn.duration(240).delay(ci * 18)}
                style={[
                  styles.cell,
                  {
                    backgroundColor:
                      cell.level === 0 ? colors.divider : colors.primary,
                    opacity: cell.level === 0 ? 0.5 : LEVEL_OPACITY[cell.level],
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 6 },
  dayLabels: { justifyContent: "space-between", paddingVertical: 1 },
  dayLabel: { fontSize: 8.5, height: 14, lineHeight: 14, textAlign: "center", width: 10 },
  grid: { flexDirection: "row", flex: 1, gap: 4 },
  column: { flex: 1, gap: 4 },
  cell: { height: 12, borderRadius: 3 },
});
