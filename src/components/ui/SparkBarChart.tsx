import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "@/theme/useTheme";

interface Props {
  values: number[];
  labels: string[];
  height?: number;
}

/** Minimal bar chart with no charting dependency — a handful of <Rect>s is
 * all a 7-bar weekly/monthly summary needs. */
export default function SparkBarChart({ values, labels, height = 120 }: Props) {
  const { colors } = useTheme();
  const max = Math.max(1, ...values);
  const barWidth = 100 / values.length;

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        {values.map((v, i) => {
          const barHeight = (v / max) * (height - 4);
          return (
            <Rect
              key={i}
              x={i * barWidth + barWidth * 0.2}
              y={height - barHeight}
              width={barWidth * 0.6}
              height={barHeight}
              rx={2}
              fill={v > 0 ? colors.primary : colors.divider}
            />
          );
        })}
      </Svg>
      <View style={styles.labelRow}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.label, { color: colors.inkFaint }]}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  label: { fontSize: 10.5, flex: 1, textAlign: "center" },
});
