import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, { Circle, Defs as SvgDefs, LinearGradient, Path, Stop } from "react-native-svg";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/useTheme";
import { smoothPath } from "@/utils/chartMath";

// react-native-svg 15 types Defs without children under React 19 types.
const Defs = SvgDefs as unknown as React.ComponentType<{ children: React.ReactNode }>;

interface Props {
  values: number[];
  labels: string[];
  height?: number;
  accessibilityLabel?: string;
}

/** Area/line trend chart that "draws" itself left to right on mount and on data change. */
export default function AreaChart({ values, labels, height = 140, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const reveal = useSharedValue(0);

  useEffect(() => {
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [values, reveal]);

  // Percentage, not reveal * width: the worklet must not capture a stale width
  // from before layout (that left the chart invisible on first render).
  const clip = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const max = Math.max(0.0001, ...values);
  const pad = 6;
  const step = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const pts = values.map((v, i) => ({ x: pad + i * step, y: pad + (1 - v / max) * (height - pad * 2) }));
  const line = smoothPath(pts, pad, height - pad);
  const area = pts.length ? `${line} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z` : "";
  const maxIndex = values.indexOf(Math.max(...values));

  return (
    <View accessible accessibilityLabel={accessibilityLabel}>
      <View onLayout={onLayout} style={{ height }}>
        {width > 0 && (
          <Animated.View style={[styles.clip, clip, { height }]}>
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.primary} stopOpacity={0.55} />
                  <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Path d={area} fill="url(#areaFill)" />
              <Path d={line} stroke="#9EE23C" strokeWidth={2.5} fill="none" strokeLinecap="round" />
              {values[maxIndex] > 0 && (
                <Circle cx={pts[maxIndex].x} cy={pts[maxIndex].y} r={4.5} fill={colors.surface} stroke="#9EE23C" strokeWidth={2.5} />
              )}
            </Svg>
          </Animated.View>
        )}
      </View>
      <View style={styles.labels}>
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
  clip: { overflow: "hidden" },
  labels: { flexDirection: "row", marginTop: 6 },
  label: { flex: 1, fontSize: 10, textAlign: "center" },
});
