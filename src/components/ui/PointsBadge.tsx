import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import GlassSurface from "./GlassSurface";
import PressableScale from "./PressableScale";
import AnimatedNumber from "./AnimatedNumber";
import { useTheme } from "@/theme/useTheme";
import { elevation } from "@/theme/colors";
import { SPRING } from "@/theme/motion";
import { LIQUID_BORDER, LIQUID_FILL, LIQUID_RIM } from "@/theme/glass";
import { ShineSweep } from "./Glint";
import { DAILY_POINTS_CAP } from "@/utils/rideScore";

interface Props {
  points: number;
  /** Points earned today, shown against the daily cap. */
  today?: number;
}

/**
 * Points, front and center: a Liquid Glass capsule with the balance in big
 * type and today's earnings against the daily cap underneath. When the
 * balance goes up it pops (spring) so a new reward is felt, not just read.
 * Tapping opens Premios.
 */
export default function PointsBadge({ points, today }: Props) {
  const { colors } = useTheme();
  const pop = useSharedValue(0);
  const prev = useRef(points);
  useEffect(() => {
    if (points > prev.current) pop.value = withSequence(withSpring(1, SPRING.bouncy), withSpring(0, SPRING.default));
    prev.current = points;
  }, [points, pop]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.08 * pop.value }] }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${-12 * pop.value}deg` }, { scale: 1 + 0.2 * pop.value }] }));

  return (
    <Animated.View style={popStyle}>
      <PressableScale depth={0.05} onPress={() => router.navigate("/(tabs)/points")} accessibilityLabel={`${points} puntos${today !== undefined ? `, ${today} hoy de ${DAILY_POINTS_CAP}` : ""}. Abrir premios`} style={[{ borderRadius: 999 }, elevation("low")]}>
        {/* Translucent Liquid Glass with a bright rim and a light that sweeps across now and then. */}
        <GlassSurface radius={999} intensity={100} specular backgroundColor={LIQUID_FILL} borderColor={LIQUID_BORDER} style={[styles.capsule, LIQUID_RIM]}>
          <ShineSweep width={170} />
          <Animated.View style={[styles.icon, { backgroundColor: colors.primary }, iconStyle]}>
            <Ionicons name="ribbon" size={16} color={colors.onPrimary} />
          </Animated.View>
          <View>
            <View style={styles.row}>
              <AnimatedNumber value={points} style={[styles.value, { color: colors.ink }]} format={(v) => v.toLocaleString("es-CO")} />
              <Text style={[styles.unit, { color: colors.inkSoft }]}>pts</Text>
            </View>
            {today !== undefined && (
              <Text style={[styles.today, { color: colors.inkSoft }]}>
                +{today.toLocaleString("es-CO")} hoy · máx. {DAILY_POINTS_CAP}
              </Text>
            )}
          </View>
        </GlassSurface>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  capsule: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 6, paddingRight: 16, paddingVertical: 6, borderWidth: 1 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: { fontSize: 19, fontWeight: "800", letterSpacing: -0.5 },
  unit: { fontSize: 12, fontWeight: "700" },
  today: { fontSize: 11, fontWeight: "600", marginTop: -1 },
});
