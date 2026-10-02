import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import ProfileButton from "@/components/ui/ProfileButton";
import GlassCard from "@/components/ui/GlassCard";
import StatTile from "@/components/ui/StatTile";
import SegmentedControl from "@/components/ui/SegmentedControl";
import ActivityHeatmap from "@/components/ui/ActivityHeatmap";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import AreaChart from "@/components/charts/AreaChart";
import BarChart from "@/components/charts/BarChart";
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
  const { points: availablePoints } = useAvailablePoints(userId);
  const { rides, stats, unlockedCodes, refresh } = useRiderStats(userId, availablePoints);
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const [habit, setHabit] = useState<"day" | "hour">("day");
  const [detail, setDetail] = useState<"habits" | "activity" | "records">("habits");

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const periodRides = useMemo(() => ridesInPeriod(rides, period), [rides, period]);
  const comparison = useMemo(() => periodComparison(rides, period), [rides, period]);
  const trend = useMemo(() => trendSeries(rides, period), [rides, period]);
  const weekdays = useMemo(() => weekdayDistribution(periodRides), [periodRides]);
  const hours = useMemo(() => hourDistribution(periodRides), [periodRides]);
  const records = useMemo(() => personalRecords(rides), [rides]);
  const heatmap = useMemo(() => activityHeatmap(rides, 84), [rides]);

  const cur = comparison.current;
  const impact = environmentalImpact(cur.distanceMeters);
  const elevation = periodRides.reduce((s, r) => s + r.elevationGainMeters, 0);
  const calories = periodRides.reduce((s, r) => s + r.caloriesKcal, 0);
  const activeDays = new Set(periodRides.map((r) => new Date(r.startedAt).toDateString())).size;
  const unit = units === "metric" ? "km" : "mi";
  const toUnit = (km: number) => (units === "metric" ? km : km * 0.621371);

  return (
    <LargeTitleScreen
      title="Progreso"
      trailing={<ProfileButton />}
      titleAccessory={
        isGuest ? (
          <View style={[styles.demoPill, { backgroundColor: colors.chipFill, borderColor: colors.chipBorder }]}>
            <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: "700" }}>DATOS DE EJEMPLO</Text>
          </View>
        ) : null
      }
    >

          <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} style={{ marginBottom: 16 }} />

          <View style={styles.hero}>
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
          </View>

          <Section title="Tu racha" />
          <StreakCard rides={rides} entranceDelay={30} />

          <Section title="Tendencia" />
          <GlassCard entranceDelay={40}>
            {/* Days (week/month) read best as bars; months (year/all) as a trend line. */}
            {period === "week" || period === "month" ? (
              <BarChart values={trend.values.map(toUnit)} labels={trend.labels} formatMax={(v) => `${v.toFixed(1)} ${unit}`} accessibilityLabel={`Distancia por día en ${unit}`} />
            ) : (
              <AreaChart values={trend.values.map(toUnit)} labels={trend.labels} accessibilityLabel={`Distancia por mes en ${unit}`} />
            )}
          </GlassCard>

          <View style={styles.grid}>
            <StatTile icon="flash-outline" label="Vel. promedio" value={formatSpeed(avgSpeedKmh(cur.distanceMeters, cur.durationSeconds), units)} />
            <StatTile icon="triangle-outline" label="Desnivel +" value={`${Math.round(elevation)} m`} />
            <StatTile icon="flame-outline" label="Calorías" value={`${Math.round(calories).toLocaleString("es-CO")} kcal`} />
            <StatTile icon="calendar-outline" label="Días activos" value={String(activeDays)} />
          </View>

          <Section title="Impacto ambiental" subtitle={`Comparado con hacer ${PERIOD_NAME[period]} esos trayectos en carro`} />
          <GlassCard entranceDelay={80}>
            <View style={styles.impactRow}>
              <Impact icon="cloud-outline" value={`${impact.co2Kg.toFixed(1)} kg`} label="CO₂ evitado" />
              <Impact icon="water-outline" value={`${impact.fuelLiters.toFixed(1)} L`} label="Gasolina ahorrada" />
              <Impact icon="leaf-outline" value={impact.treesYear.toFixed(1)} label="Árboles / año" />
            </View>
          </GlassCard>

          {/* Depth on demand: one container, one view at a time. */}
          <Section title="Más detalle" />
          <GlassCard entranceDelay={100}>
            <SegmentedControl
              options={[
                { label: "Hábitos", value: "habits" },
                { label: "Actividad", value: "activity" },
                { label: "Récords", value: "records" },
              ]}
              value={detail}
              onChange={setDetail}
              style={{ marginBottom: 16 }}
            />
            {detail === "habits" && (
              <>
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
              </>
            )}
            {detail === "activity" && (
              <>
                <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginBottom: 10 }}>Últimas 12 semanas</Text>
                <ActivityHeatmap cells={heatmap} />
              </>
            )}
            {detail === "records" && (
              <>
                <RecordRow icon="map-outline" label="Recorrido más largo" value={records.longestRideMeters ? formatDistance(records.longestRideMeters, units) : "—"} />
                <RecordRow icon="hourglass-outline" label="Más tiempo en ruta" value={records.longestDurationSeconds ? formatDuration(records.longestDurationSeconds) : "—"} />
                <RecordRow icon="flash-outline" label="Mejor velocidad promedio" value={records.fastestAvgSpeedKmh ? formatSpeed(records.fastestAvgSpeedKmh, units) : "—"} />
                <RecordRow icon="sunny-outline" label="Mejor día" value={records.bestDayMeters ? formatDistance(records.bestDayMeters, units) : "—"} />
                <RecordRow icon="ribbon-outline" label="Más puntos en un recorrido" value={records.mostPointsInRide ? `${records.mostPointsInRide} pts` : "—"} last />
              </>
            )}
          </GlassCard>

          <Section title={`Logros · ${unlockedCodes.size}/${ACHIEVEMENTS.length}`} />
          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS.map((a, i) => {
              const unlocked = unlockedCodes.has(a.code);
              const p = unlocked ? 1 : a.progress(stats);
              return (
                <GlassCard key={a.code} containerStyle={styles.achievementCard} style={!unlocked ? { opacity: 0.7 } : undefined} entranceDelay={Math.min(i, 8) * 30}>
                  <View style={styles.achievementHead}>
                    <Ionicons name={a.icon as any} size={22} color={unlocked ? colors.primaryDark : colors.inkFaint} />
                    {unlocked && <Ionicons name="checkmark-circle" size={16} color={colors.primaryDark} />}
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

    </LargeTitleScreen>
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
      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "700" }}>{value}</Text>
      <DeltaBadge pct={pct} />
    </View>
  );
}

function Impact({ icon, value, label }: { icon: any; value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.impact}>
      <View style={[styles.impactIcon, { backgroundColor: colors.chipFill, borderColor: colors.chipBorder }]}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: "700", marginTop: 8 }}>{value}</Text>
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
      <Text style={{ color: colors.ink, fontSize: 13.5, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Essential level sits on the page (no card), like Inicio.
  hero: { paddingBottom: 4 },
  demoPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  eyebrow: { fontSize: 12.5, fontWeight: "600" },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  heroValue: { fontSize: 38, fontWeight: "700", letterSpacing: -1 },
  kpiRow: { flexDirection: "row", gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: 1 },
  section: { marginTop: 32, marginBottom: 12 },
  sectionTitle: { fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  link: { fontSize: 12.5, fontWeight: "700", marginTop: 8 },
  impactRow: { flexDirection: "row", justifyContent: "space-between" },
  impact: { flex: 1, alignItems: "center" },
  impactIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  recordRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
  track: { borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  achievementsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  achievementCard: { flexBasis: "46%", flexGrow: 1 },
  achievementHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  achievementTitle: { fontSize: 13.5, fontWeight: "700", marginTop: 8 },
  achievementDesc: { fontSize: 11.5, marginTop: 2, lineHeight: 15 },
  historyLink: { flexDirection: "row", alignItems: "center", gap: 10 },
});
