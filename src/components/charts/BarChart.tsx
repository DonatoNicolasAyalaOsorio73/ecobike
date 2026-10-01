import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";

interface Props {
  values: number[];
  labels: string[];
  height?: number;
  /** Formats the value shown above the chart for the tallest bar. */
  formatMax?: (v: number) => string;
  accessibilityLabel?: string;
}

function Bar({ ratio, index, highlight, height }: { ratio: number; index: number; highlight: boolean; height: number }) {
  const { colors } = useTheme();
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(index * 35, withSpring(ratio, SPRING.default));
  }, [ratio, index, h]);
  const style = useAnimatedStyle(() => ({ height: Math.max(3, h.value * height) }));
  return (
    <View style={[styles.slot, { height }]}>
      <Animated.View
        style={[
          styles.bar,
          style,
          { backgroundColor: ratio > 0 ? (highlight ? colors.primaryDark : colors.primary) : colors.divider },
        ]}
      />
    </View>
  );
}

/** Animated bar chart: bars grow with a spring, staggered left to right; the max bar is highlighted. */
export default function BarChart({ values, labels, height = 120, formatMax, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const max = Math.max(0, ...values);
  const maxIndex = values.indexOf(max);
  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      {formatMax && max > 0 ? <Text style={[styles.maxLabel, { color: colors.inkSoft }]}>Máx. {formatMax(max)}</Text> : null}
      <View style={styles.row}>
        {values.map((v, i) => (
          <Bar key={i} index={i} ratio={max > 0 ? v / max : 0} highlight={i === maxIndex && max > 0} height={height} />
        ))}
      </View>
      <View style={styles.row}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.label, { color: colors.inkFaint }]} numberOfLines={1}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  slot: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  // Slim capsule bars (Apple Fitness/Health) rather than full-width blocks.
  bar: { width: "58%", maxWidth: 22, borderRadius: 999 },
  label: { flex: 1, fontSize: 10.5, textAlign: "center", marginTop: 6 },
  maxLabel: { fontSize: 11, fontWeight: "700", textAlign: "right", marginBottom: 6 },
});
