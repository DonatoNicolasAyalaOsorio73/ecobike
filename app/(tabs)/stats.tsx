import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import StatTile from "@/components/ui/StatTile";
import SparkBarChart from "@/components/ui/SparkBarChart";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ProgressRing from "@/components/ui/ProgressRing";
import ActivityHeatmap from "@/components/ui/ActivityHeatmap";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useTheme } from "@/theme/useTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDistance, formatDuration, formatSpeed } from "@/utils/format";
import { ACHIEVEMENTS } from "@/types/achievement";
import {
  activityHeatmap,
  distanceThisWeek,
  personalRecords,
  ridesInPeriod,
  type StatsPeriod,
} from "@/utils/rideStats";

const CO2_KG_SAVED_PER_KM = 0.12; // avg. car tailpipe emissions displaced per km cycled

const PERIOD_OPTIONS: { label: string; value: StatsPeriod }[] = [
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Año", value: "year" },
  { label: "Todo", value: "all" },
];

export default function StatsScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const units = useSettingsStore((s) => s.units);
  const weeklyGoalKm = useSettingsStore((s) => s.weeklyGoalKm);
  const { points: availablePoints } = useAvailablePoints(userId);
  const { rides, unlockedCodes, level, nextLevelAt, refresh } = useRiderStats(userId, availablePoints);
  const [period, setPeriod] = useState<StatsPeriod>("week");

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const periodRides = useMemo(() => ridesInPeriod(rides, period), [rides, period]);
  const records = useMemo(() => personalRecords(rides), [rides]);
  const heatmap = useMemo(() => activityHeatmap(rides, 84), [rides]);

  const periodDistance = periodRides.reduce((s, r) => s + r.distanceMeters, 0);
  const periodDuration = periodRides.reduce((s, r) => s + r.durationSeconds, 0);
  const periodBest = periodRides.reduce((m, r) => Math.max(m, r.distanceMeters), 0);
  const periodStreakDays = new Set(periodRides.map((r) => new Date(r.startedAt).toDateString())).size;

  const weekKm = distanceThisWeek(rides) / 1000;
  const goalProgress = weeklyGoalKm > 0 ? weekKm / weeklyGoalKm : 0;
  const goalMet = goalProgress >= 1;

  const weeklyKm = lastNDaysBuckets(rides, 7).map((m) => m / 1000);
  const co2Saved = (periodDistance / 1000) * CO2_KG_SAVED_PER_KM;
  const progressToNext = nextLevelAt ? Math.min(1, availablePoints / nextLevelAt) : 1;

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.header, { color: colors.ink }]}>Estadísticas</Text>

          <SegmentedControl
            options={PERIOD_OPTIONS}
            value={period}
            onChange={setPeriod}
            style={{ marginBottom: 16 }}
          />

          <GlassCard>
            <View style={styles.goalRow}>
              <ProgressRing progress={goalProgress} size={104} thickness={11}>
                <AnimatedNumber
                  value={Math.round(Math.min(999, goalProgress * 100))}
                  style={[styles.goalPercent, { color: colors.ink }]}
                  format={(v) => `${v}%`}
                />
                <Text style={{ fontSize: 10.5, color: colors.inkSoft, marginTop: 1 }}>meta</Text>
              </ProgressRing>

              <View style={styles.goalCopy}>
                <Text style={[styles.cardTitle, { color: colors.ink, marginBottom: 4 }]}>Meta semanal</Text>
                <Text style={{ color: colors.inkSoft, fontSize: 13, lineHeight: 18 }}>
                  {goalMet
                    ? `¡Meta cumplida! Llevas ${weekKm.toFixed(1)} km de ${weeklyGoalKm} km esta semana.`
                    : `Llevas ${weekKm.toFixed(1)} km de ${weeklyGoalKm} km. Te faltan ${Math.max(0, weeklyGoalKm - weekKm).toFixed(1)} km.`}
                </Text>
                <Text
                  style={[styles.link, { color: colors.primaryDark }]}
                  onPress={() => router.push("/settings")}
                >
                  Cambiar meta
                </Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={{ marginTop: 16 }} entranceDelay={40}>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>Esta semana</Text>
            <SparkBarChart values={weeklyKm} labels={["L", "M", "X", "J", "V", "S", "D"]} />
          </GlassCard>

          <View style={styles.grid}>
            <StatTile icon="speedometer-outline" label="Km del periodo" value={formatDistance(periodDistance, units)} accent />
            <StatTile icon="time-outline" label="Tiempo" value={formatDuration(periodDuration)} />
            <StatTile icon="bicycle-outline" label="Recorridos" value={String(periodRides.length)} />
            <StatTile icon="trending-up-outline" label="Mejor del periodo" value={periodBest ? formatDistance(periodBest, units) : "—"} />
            <StatTile icon="leaf-outline" label="CO₂ evitado (est.)" value={`${co2Saved.toFixed(1)} kg`} accent />
            <StatTile icon="calendar-outline" label="Días activos" value={`${periodStreakDays}`} />
          </View>

          <Text style={[styles.sectionHeader, { color: colors.ink }]}>Actividad (12 semanas)</Text>
          <GlassCard entranceDelay={60}>
            <ActivityHeatmap cells={heatmap} />
            <View style={styles.legendRow}>
              <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>Menos</Text>
              <View style={styles.legendCells}>
                {[0, 1, 2, 3, 4].map((l) => (
                  <View
                    key={l}
                    style={[
                      styles.legendCell,
                      {
                        backgroundColor: l === 0 ? colors.divider : colors.primary,
                        opacity: l === 0 ? 0.5 : [0, 0.25, 0.45, 0.7, 1][l],
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={{ fontSize: 10.5, color: colors.inkFaint }}>Más</Text>
            </View>
          </GlassCard>

          <Text style={[styles.sectionHeader, { color: colors.ink }]}>Récords personales</Text>
          <GlassCard entranceDelay={80}>
            <RecordRow icon="map-outline" label="Recorrido más largo" value={records.longestRideMeters ? formatDistance(records.longestRideMeters, units) : "—"} />
            <RecordRow icon="hourglass-outline" label="Más tiempo en ruta" value={records.longestDurationSeconds ? formatDuration(records.longestDurationSeconds) : "—"} />
            <RecordRow icon="flash-outline" label="Velocidad promedio máxima" value={records.fastestAvgSpeedKmh ? formatSpeed(records.fastestAvgSpeedKmh, units) : "—"} />
            <RecordRow icon="sunny-outline" label="Mejor día" value={records.bestDayMeters ? formatDistance(records.bestDayMeters, units) : "—"} />
            <RecordRow icon="ribbon-outline" label="Más puntos en un recorrido" value={records.mostPointsInRide ? `${records.mostPointsInRide} pts` : "—"} last />
          </GlassCard>

          <GlassCard style={{ marginTop: 16 }} entranceDelay={100}>
            <View style={styles.levelRow}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>Nivel {level}</Text>
              <Text style={{ color: colors.inkSoft, fontSize: 12.5 }}>
                {availablePoints} {nextLevelAt ? `/ ${nextLevelAt} pts` : "pts (máximo)"}
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.divider }]}>
              <View style={[styles.progressFill, { width: `${progressToNext * 100}%`, backgroundColor: colors.primary }]} />
            </View>
          </GlassCard>

          <Text style={[styles.sectionHeader, { color: colors.ink }]}>
            Logros · {unlockedCodes.size}/{ACHIEVEMENTS.length}
          </Text>
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((a, i) => {
              const unlocked = unlockedCodes.has(a.code);
              return (
                <GlassCard key={a.code} style={[styles.achievementCard, !unlocked && { opacity: 0.45 }]} entranceDelay={i * 30}>
                  <Ionicons name={a.icon as any} size={22} color={unlocked ? colors.primaryDark : colors.inkFaint} />
                  <Text style={[styles.achievementTitle, { color: colors.ink }]}>{a.title}</Text>
                  <Text style={[styles.achievementDesc, { color: colors.inkSoft }]} numberOfLines={2}>
                    {a.description}
                  </Text>
                </GlassCard>
              );
            })}
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function RecordRow({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.recordRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Ionicons name={icon} size={17} color={colors.primaryDark} />
      <Text style={{ color: colors.inkSoft, fontSize: 13, flex: 1, marginLeft: 10 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 13.5, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

function lastNDaysBuckets(rides: { startedAt: number; distanceMeters: number }[], n: number): number[] {
  const buckets = new Array(n).fill(0);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const r of rides) {
    const d = new Date(r.startedAt);
    const dayDiff = Math.floor((startOfToday.getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
    const index = n - 1 - dayDiff;
    if (index >= 0 && index < n) buckets[index] += r.distanceMeters;
  }
  return buckets;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  goalCopy: { flex: 1 },
  goalPercent: { fontSize: 21, fontWeight: "800" },
  link: { fontSize: 12.5, fontWeight: "700", marginTop: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  legendRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6, marginTop: 12 },
  legendCells: { flexDirection: "row", gap: 3 },
  legendCell: { width: 11, height: 11, borderRadius: 3 },
  recordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  sectionHeader: { fontSize: 17, fontWeight: "800", marginTop: 20, marginBottom: 10 },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  achievementCard: { width: "47%" },
  achievementTitle: { fontSize: 13.5, fontWeight: "700", marginTop: 8 },
  achievementDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 15 },
});
