import React, { useCallback, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue } from "react-native-reanimated";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import ProfileButton from "@/components/ui/ProfileButton";
import PressableScale from "@/components/ui/PressableScale";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import ProgressRing from "@/components/ui/ProgressRing";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Flame from "@/components/ui/Flame";
import PointsBadge from "@/components/ui/PointsBadge";
import { pointsToday } from "@/utils/streak";
import BarChart from "@/components/charts/BarChart";
import DeltaBadge from "@/components/charts/DeltaBadge";
import MissionsCard from "@/components/MissionsCard";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { useRewards } from "@/hooks/useRewards";
import { computeStreakDays } from "@/utils/gamification";
import { distanceThisWeek, environmentalImpact, periodComparison, trendSeries } from "@/utils/rideStats";
import { formatDistance, formatDuration } from "@/utils/format";

function greeting(h: number) {
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/**
 * Inicio, in three levels of depth (only real data):
 *  1. Essential: where you stand this week, set in type on the page (no
 *     card), and the one action that matters: ride.
 *  2. Today: missions and the next reward to work toward.
 *  3. Detail on demand: one "Tu semana" card whose rows lead into Progreso
 *     and the last ride, instead of a wall of separate widgets.
 * Everything else (codes, history, friends, invite) lives one tap away in
 * its own tab or screen, so it isn't repeated here.
 */
export default function HomeScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const isGuest = useAuthStore((s) => s.isGuest);
  const profile = useAuthStore((s) => s.profile);
  const localFirst = useLocalProfileStore((s) => s.firstName);
  const units = useSettingsStore((s) => s.units);
  const weeklyGoalKm = useSettingsStore((s) => s.weeklyGoalKm);
  const { points, isRealAccount } = useAvailablePoints(userId);
  const { rides, refresh } = useRiderStats(userId, points);
  const { rewards, refresh: refreshRewards } = useRewards(userId, isRealAccount);
  const reduceMotion = useReducedMotion();
  const scrollY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshRewards();
    }, [refresh, refreshRewards])
  );

  const now = new Date();
  const firstName = (profile?.firstName || localFirst || "").trim();
  const weekKm = distanceThisWeek(rides) / 1000;
  const weekProgress = weeklyGoalKm > 0 ? weekKm / weeklyGoalKm : 0;
  const streak = computeStreakDays(rides.map((r) => new Date(r.startedAt)));
  const comparison = useMemo(() => periodComparison(rides, "week"), [rides]);
  const trend = useMemo(() => trendSeries(rides, "week"), [rides]);
  const lastRide = rides[0];
  const impact = environmentalImpact(comparison.current.distanceMeters);
  const unit = units === "metric" ? "km" : "mi";
  const toUnit = (km: number) => (units === "metric" ? km : km * 0.621371);

  // The cheapest reward still out of reach: a concrete next goal.
  const sorted = [...rewards].sort((a, b) => a.pointsCost - b.pointsCost);
  const nextReward = sorted.find((r) => r.pointsCost > points);
  const affordable = sorted.filter((r) => r.pointsCost <= points).length;

  // Hero drifts slower than the scroll (subtle parallax) and fades as it leaves.
  const heroStyle = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    return {
      opacity: interpolate(scrollY.value, [0, 240], [1, 0.3], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(scrollY.value, [0, 240], [0, 50], Extrapolation.CLAMP) }],
    };
  });

  return (
    <LargeTitleScreen
      eyebrow={`${greeting(now.getHours())} · ${format(now, "EEEE d 'de' MMMM", { locale: es })}`}
      title={firstName ? `Hola, ${firstName}` : "Hola"}
      trailing={<ProfileButton />}
      scrollY={scrollY}
    >
      {/* Level 1 — the week, typography first */}
      <Animated.View style={[styles.hero, heroStyle]}>
        <View style={styles.heroRow}>
          <ProgressRing progress={weekProgress} size={124} thickness={12}>
            <AnimatedNumber value={Math.round(Math.min(999, weekProgress * 100))} style={[type.title2, { color: colors.ink }]} format={(v) => `${v}%`} />
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <Text style={[type.eyebrow, { color: colors.inkSoft }]}>Esta semana</Text>
            <AnimatedNumber
              value={Math.round(toUnit(weekKm) * 10)}
              style={[type.display, { color: colors.ink }]}
              format={(v) => `${(v / 10).toFixed(1)} ${unit}`}
            />
            <Text style={[type.footnote, { color: colors.inkSoft }]}>
              {weekProgress >= 1
                ? `Meta de ${toUnit(weeklyGoalKm).toFixed(0)} ${unit} cumplida`
                : `Faltan ${Math.max(0, toUnit(weeklyGoalKm - weekKm)).toFixed(1)} de ${toUnit(weeklyGoalKm).toFixed(0)} ${unit}`}
            </Text>
          </View>
        </View>
        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Flame size={15} lit={streak > 0} />
            <Text style={[type.subhead, { color: colors.ink, fontWeight: "600" }]}>
              {streak} {streak === 1 ? "día" : "días"} de racha
            </Text>
          </View>
          <PointsBadge points={points} today={pointsToday(rides)} />
        </View>
        <GlassButton label="Iniciar recorrido" icon="play" onPress={() => router.navigate("/(tabs)/map")} disabled={!userId} style={{ marginTop: 22 }} />
      </Animated.View>

      <View style={{ marginHorizontal: -20 }}>
        <EmailVerifyBanner />
      </View>

      {/* Level 2 — today */}
      <View style={{ height: 36 }} />
      <MissionsCard rides={rides} entranceDelay={80} />

      {rewards.length > 0 && (
        <PressableScale style={{ marginTop: 12 }} onPress={() => router.navigate("/(tabs)/points")} accessibilityLabel="Abrir recompensas">
          <GlassCard entranceDelay={120} style={styles.rewardRow}>
            <View style={[styles.rewardIcon, { backgroundColor: nextReward ? colors.chipFill : colors.primary }]}>
              <Ionicons name={((nextReward ?? sorted[0])?.icon as any) ?? "gift"} size={20} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              {nextReward ? (
                <>
                  <Text style={[type.callout, { color: colors.ink, fontWeight: "600" }]} numberOfLines={1}>
                    {nextReward.title}
                  </Text>
                  <Meter value={points / nextReward.pointsCost} />
                  <Text style={[type.footnote, { color: colors.inkSoft }]}>Te faltan {(nextReward.pointsCost - points).toLocaleString("es-CO")} pts</Text>
                </>
              ) : (
                <>
                  <Text style={[type.callout, { color: colors.ink, fontWeight: "600" }]}>
                    Puedes canjear {affordable} {affordable === 1 ? "recompensa" : "recompensas"}
                  </Text>
                  <Text style={[type.footnote, { color: colors.inkSoft }]}>En tiendas aliadas</Text>
                </>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
          </GlassCard>
        </PressableScale>
      )}

      {/* Level 3 — the week in detail, one container, rows lead deeper */}
      <View style={styles.section}>
        <Text style={[type.title3, { color: colors.ink }]} accessibilityRole="header">
          Tu semana
        </Text>
        <Text onPress={() => router.navigate("/(tabs)/stats")} accessibilityRole="link" style={[type.subhead, { color: colors.inkSoft, fontWeight: "600" }]}>
          Progreso ›
        </Text>
      </View>
      <GlassCard entranceDelay={160}>
        <View style={styles.weekHead}>
          <Text style={[type.title3, { color: colors.ink }]}>{formatDistance(comparison.current.distanceMeters, units)}</Text>
          <DeltaBadge pct={comparison.change?.distance} />
        </View>
        <Text style={[type.footnote, { color: colors.inkSoft, marginBottom: 14 }]}>
          {comparison.current.rides} {comparison.current.rides === 1 ? "recorrido" : "recorridos"} · {formatDuration(comparison.current.durationSeconds)}
        </Text>
        <BarChart values={trend.values.map(toUnit)} labels={trend.labels} height={96} formatMax={(v) => `${v.toFixed(1)} ${unit}`} accessibilityLabel={`Distancia por día esta semana en ${unit}`} />

        <View style={[styles.rows, { borderTopColor: colors.divider }]}>
          {lastRide ? (
            <PressableScale onPress={() => router.push(`/ride/${lastRide.id}`)} accessibilityLabel="Ver último recorrido" style={styles.row}>
              <Ionicons name="bicycle" size={18} color={colors.primaryDark} />
              <Text style={[type.subhead, { color: colors.inkSoft, flex: 1 }]}>Último recorrido</Text>
              <Text style={[type.subhead, { color: colors.ink, fontWeight: "600" }]}>
                {formatDistance(lastRide.distanceMeters, units)} · {format(new Date(lastRide.startedAt), "EEE d", { locale: es })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
            </PressableScale>
          ) : (
            <View style={styles.row}>
              <Ionicons name="bicycle-outline" size={18} color={colors.inkSoft} />
              <Text style={[type.subhead, { color: colors.inkSoft, flex: 1 }]}>Tu primer recorrido aparecerá aquí</Text>
            </View>
          )}
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}>
            <Ionicons name="leaf" size={18} color={colors.primaryDark} />
            <Text style={[type.subhead, { color: colors.inkSoft, flex: 1 }]}>CO₂ evitado</Text>
            <Text style={[type.subhead, { color: colors.ink, fontWeight: "600" }]}>{impact.co2Kg.toFixed(1)} kg</Text>
          </View>
        </View>
      </GlassCard>

      {isGuest && <Text style={[type.footnote, styles.demo, { color: colors.inkFaint }]}>Modo invitado: datos de ejemplo en este dispositivo.</Text>}
    </LargeTitleScreen>
  );
}

function Meter({ value }: { value: number }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { backgroundColor: colors.divider }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}>
      <View style={[styles.fill, { width: `${v * 100}%`, backgroundColor: colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 8 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 20, marginTop: 20 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  section: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 36, marginBottom: 12 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  rewardIcon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  weekHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  rows: { marginTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  demo: { textAlign: "center", marginTop: 24 },
});
