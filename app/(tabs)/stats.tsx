import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import StatTile from "@/components/ui/StatTile";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ProgressRing from "@/components/ui/ProgressRing";
import ActivityHeatmap from "@/components/ui/ActivityHeatmap";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import AreaChart from "@/components/charts/AreaChart";
import BarChart from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import DeltaBadge from "@/components/charts/DeltaBadge";
import StreakCard from "@/components/StreakCard";
import { useTheme } from "@/theme/useTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { formatDistance, formatDuration, formatSpeed } from "@/utils/format";
import { avgSpeedKmh } from "@/utils/geo";
import { ACHIEVEMENTS } from "@/types/achievement";
import {
  activityHeatmap,
  distanceBuckets,
  distanceThisWeek,
  environmentalImpact,
  hourDistribution,
  periodComparison,
  personalRecords,
  ridesInPeriod,
  trendSeries,
  weekdayDistribution,
  type StatsPeriod,
} from "@/utils/rideStats";

const PERIOD_OPTIONS: { label: string; value: StatsPeriod }[] = [
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Año", value: "year" },
  { label: "Todo", value: "all" },
];

const PERIOD_NAME: Record<StatsPeriod, string> = { week: "esta semana", month: "este mes", year: "este año", all: "en total" };
const PREV_NAME: Record<StatsPeriod, string> = { week: "la semana pasada", month: "el mes pasado", year: "el año pasado", all: "" };

export default function StatsScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const isGuest = useAuthStore((s) => s.isGuest);
  const units = useSettingsStore((s) => s.units);
  const weeklyGoalKm = useSettingsStore((s) => s.weeklyGoalKm);
  const { points: availablePoints } = useAvailablePoints(userId);
  const { rides, stats, unlockedCodes, level, nextLevelAt, refresh } = useRiderStats(userId, availablePoints);
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const [habit, setHabit] = useState<"day" | "hour">("day");

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const periodRides = useMemo(() => ridesInPeriod(rides, period), [rides, period]);
  const comparison = useMemo(() => periodComparison(rides, period), [rides, period]);
  const trend = useMemo(() => trendSeries(rides, period), [rides, period]);
  const weekdays = useMemo(() => weekdayDistribution(periodRides), [periodRides]);
  const hours = useMemo(() => hourDistribution(periodRides), [periodRides]);
  const buckets = useMemo(() => distanceBuckets(periodRides), [periodRides]);
  const records = useMemo(() => personalRecords(rides), [rides]);
  const heatmap = useMemo(() => activityHeatmap(rides, 84), [rides]);

  const cur = comparison.current;
  const impact = environmentalImpact(cur.distanceMeters);
  const elevation = periodRides.reduce((s, r) => s + r.elevationGainMeters, 0);
  const calories = periodRides.reduce((s, r) => s + r.caloriesKcal, 0);
  const activeDays = new Set(periodRides.map((r) => new Date(r.startedAt).toDateString())).size;
  const weekKm = distanceThisWeek(rides) / 1000;
  const goalProgress = weeklyGoalKm > 0 ? weekKm / weeklyGoalKm : 0;
  const progressToNext = nextLevelAt ? Math.min(1, availablePoints / nextLevelAt) : 1;
  const unit = units === "metric" ? "km" : "mi";
  const toUnit = (km: number) => (units === "metric" ? km : km * 0.621371);

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={[styles.header, { color: colors.ink }]} accessibilityRole="header">
              Estadísticas
            </Text>
            {isGuest && (
              <View style={[styles.demoPill, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "800" }}>DATOS DE EJEMPLO</Text>
              </View>
            )}
          </View>

          <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} style={{ marginBottom: 16 }} />

          <GlassCard intensity={45}>
            <Text style={[styles.eyebrow, { color: colors.inkSoft }]}>Distancia {PERIOD_NAME[period]}</Text>
            <View style={styles.heroRow}>
              <AnimatedNumber
                value={Math.round(toUnit(cur.distanceMeters / 1000) * 10)}
                style={[styles.heroValue, { color: colors.ink }]}
                format={(v) => `${(v / 10).toFixed(1)} ${unit}`}
              />
              <DeltaBadge pct={comparison.change?.distance} />
            </View>
            {comparison.previous && (
              <Text style={{ color: colors.inkFaint, fontSize: 12 }}>
                {formatDistance(comparison.previous.distanceMeters, units)} {PREV_NAME[period]}
              </Text>
            )}
            <View style={[styles.kpiRow, { borderTopColor: colors.divider }]}>
              <Kpi label="Tiempo" value={formatDuration(cur.durationSeconds)} pct={comparison.change?.duration} />
              <Kpi label="Recorridos" value={String(cur.rides)} pct={comparison.change?.rides} />
              <Kpi label="Puntos" value={String(cur.points)} pct={comparison.change?.points} />
            </View>
          </GlassCard>

          <Section title="Tu racha" />
          <StreakCard rides={rides} entranceDelay={30} />

          <Section title="Tendencia" />
          <GlassCard entranceDelay={40}>
            <AreaChart values={trend.values.map(toUnit)} labels={trend.labels} accessibilityLabel={`Distancia por periodo en ${unit}`} />
          </GlassCard>

          <View style={styles.grid}>
            <StatTile icon="flash-outline" label="Vel. promedio" value={formatSpeed(avgSpeedKmh(cur.distanceMeters, cur.durationSeconds), units)} accent />
            <StatTile icon="triangle-outline" label="Desnivel +" value={`${Math.round(elevation)} m`} />
            <StatTile icon="flame-outline" label="Calorías" value={`${Math.round(calories).toLocaleString("es-CO")} kcal`} />
            <StatTile icon="calendar-outline" label="Días activos" value={String(activeDays)} />
            <StatTile icon="bonfire-outline" label="Racha actual" value={`${stats.currentStreakDays} ${stats.currentStreakDays === 1 ? "día" : "días"}`} accent />
            <StatTile icon="speedometer-outline" label="Por recorrido" value={cur.rides ? formatDistance(cur.distanceMeters / cur.rides, units) : "—"} />
          </View>

          <Section title="Meta semanal" />
          <GlassCard entranceDelay={60}>
            <View style={styles.goalRow}>
              <ProgressRing progress={goalProgress} size={96} thickness={10}>
                <AnimatedNumber
                  value={Math.round(Math.min(999, goalProgress * 100))}
                  style={[styles.goalPercent, { color: colors.ink }]}
                  format={(v) => `${v}%`}
                />
              </ProgressRing>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 15 }}>
                  {goalProgress >= 1 ? "Meta cumplida" : `Faltan ${Math.max(0, weeklyGoalKm - weekKm).toFixed(1)} km`}
                </Text>
                <Text style={{ color: colors.inkSoft, fontSize: 13, marginTop: 4 }}>
                  {weekKm.toFixed(1)} de {weeklyGoalKm} km esta semana
                </Text>
                <Text style={[styles.link, { color: colors.primaryDark }]} onPress={() => router.push("/settings")}>
                  Cambiar meta
                </Text>
              </View>
            </View>
          </GlassCard>

          <Section title="Impacto ambiental" subtitle={`Comparado con hacer ${PERIOD_NAME[period]} esos trayectos en carro`} />
          <GlassCard entranceDelay={80}>
            <View style={styles.impactRow}>
              <Impact icon="cloud-outline" value={`${impact.co2Kg.toFixed(1)} kg`} label="CO₂ evitado" />
              <Impact icon="water-outline" value={`${impact.fuelLiters.toFixed(1)} L`} label="Gasolina ahorrada" />
              <Impact icon="leaf-outline" value={impact.treesYear.toFixed(1)} label="Árboles / año" />
            </View>
          </GlassCard>

          <Section title="Tus hábitos" />
          <GlassCard entranceDelay={100}>
            <SegmentedControl
              options={[
                { label: "Por día", value: "day" },
                { label: "Por hora", value: "hour" },
              ]}
              value={habit}
              onChange={setHabit}
              style={{ marginBottom: 14 }}
            />
            {habit === "day" ? (
              <BarChart
                values={weekdays.values.map(toUnit)}
                labels={weekdays.labels}
                formatMax={(v) => `${v.toFixed(1)} ${unit}`}
                accessibilityLabel="Distancia por día de la semana"
              />
            ) : (
              <BarChart values={hours.values} labels={hours.labels} formatMax={(v) => `${v} recorridos`} accessibilityLabel="Recorridos por franja horaria" />
            )}
          </GlassCard>

          <Section title="Tipos de recorrido" />
          <GlassCard entranceDelay={120}>
            <DonutChart
              size={112}
              thickness={16}
              centerLabel="recorridos"
              slices={[
                { label: "Cortos · < 5 km", value: buckets.short, color: colors.primaryLight },
                { label: "Medios · 5–15", value: buckets.medium, color: colors.primary },
                { label: "Largos · > 15 km", value: buckets.long, color: colors.primaryDark },
              ]}
            />
          </GlassCard>

          <Section title="Actividad (12 semanas)" />
          <GlassCard entranceDelay={140}>
            <ActivityHeatmap cells={heatmap} />
          </GlassCard>

          <Section title="Récords personales" />
          <GlassCard entranceDelay={160}>
            <RecordRow icon="map-outline" label="Recorrido más largo" value={records.longestRideMeters ? formatDistance(records.longestRideMeters, units) : "—"} />
            <RecordRow icon="hourglass-outline" label="Más tiempo en ruta" value={records.longestDurationSeconds ? formatDuration(records.longestDurationSeconds) : "—"} />
            <RecordRow icon="flash-outline" label="Mejor velocidad promedio" value={records.fastestAvgSpeedKmh ? formatSpeed(records.fastestAvgSpeedKmh, units) : "—"} />
            <RecordRow icon="sunny-outline" label="Mejor día" value={records.bestDayMeters ? formatDistance(records.bestDayMeters, units) : "—"} />
            <RecordRow icon="ribbon-outline" label="Más puntos en un recorrido" value={records.mostPointsInRide ? `${records.mostPointsInRide} pts` : "—"} last />
          </GlassCard>

          <Section title={`Nivel ${level}`} />
          <GlassCard entranceDelay={180}>
            <View style={styles.levelRow}>
              <Text style={{ color: colors.inkSoft, fontSize: 12.5 }}>
                {availablePoints.toLocaleString("es-CO")} {nextLevelAt ? `/ ${nextLevelAt.toLocaleString("es-CO")} pts` : "pts (nivel máximo)"}
              </Text>
              <Text style={{ color: colors.primaryDark, fontSize: 12.5, fontWeight: "800" }}>{Math.round(progressToNext * 100)}%</Text>
            </View>
            <ProgressBar value={progressToNext} />
          </GlassCard>

          <Section title={`Logros · ${unlockedCodes.size}/${ACHIEVEMENTS.length}`} />
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((a, i) => {
              const unlocked = unlockedCodes.has(a.code);
              const p = unlocked ? 1 : a.progress(stats);
              return (
                <GlassCard key={a.code} containerStyle={[styles.achievementCard, !unlocked && { opacity: 0.7 }]} entranceDelay={Math.min(i, 8) * 30}>
                  <View style={styles.achievementHead}>
                    <Ionicons name={a.icon as any} size={22} color={unlocked ? colors.primaryDark : colors.inkFaint} />
                    {unlocked && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
                  </View>
                  <Text style={[styles.achievementTitle, { color: colors.ink }]}>{a.title}</Text>
                  <Text style={[styles.achievementDesc, { color: colors.inkSoft }]} numberOfLines={2}>
                    {a.description}
                  </Text>
                  <ProgressBar value={p} small />
                </GlassCard>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={() => router.push("/history")} style={{ marginTop: 18 }}>
            <GlassCard>
              <View style={styles.historyLink}>
                <Ionicons name="list-outline" size={18} color={colors.primaryDark} />
                <Text style={{ color: colors.ink, fontWeight: "700", flex: 1 }}>Ver historial completo</Text>
                <Text style={{ color: colors.inkSoft }}>{rides.length}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </View>
            </GlassCard>
          </Pressable>

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={{ color: colors.inkFaint, fontSize: 12, marginTop: 2 }}>{subtitle}</Text> : null}
    </View>
  );
}

function Kpi({ label, value, pct }: { label: string; value: string; pct: number | null | undefined }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ color: colors.inkSoft, fontSize: 11.5 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "800" }}>{value}</Text>
      <DeltaBadge pct={pct} />
    </View>
  );
}

function Impact({ icon, value, label }: { icon: any; value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.impact}>
      <View style={[styles.impactIcon, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 8 }}>{value}</Text>
      <Text style={{ color: colors.inkSoft, fontSize: 11, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

function ProgressBar({ value, small }: { value: number; small?: boolean }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      style={[styles.track, { height: small ? 5 : 8, backgroundColor: colors.divider, marginTop: small ? 10 : 4 }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
    >
      <View style={[styles.fill, { width: `${v * 100}%`, backgroundColor: colors.primary }]} />
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  header: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  demoPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  eyebrow: { fontSize: 12.5, fontWeight: "600" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  heroValue: { fontSize: 38, fontWeight: "800", letterSpacing: -1 },
  kpiRow: { flexDirection: "row", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  section: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  goalPercent: { fontSize: 19, fontWeight: "800" },
  link: { fontSize: 12.5, fontWeight: "700", marginTop: 8 },
  impactRow: { flexDirection: "row", justifyContent: "space-between" },
  impact: { flex: 1, alignItems: "center" },
  impactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  recordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  track: { borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  achievementCard: { flexBasis: "46%", flexGrow: 1 },
  achievementHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  achievementTitle: { fontSize: 13.5, fontWeight: "700", marginTop: 8 },
  achievementDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 15 },
  historyLink: { flexDirection: "row", alignItems: "center", gap: 10 },
});
