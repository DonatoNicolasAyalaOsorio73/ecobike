import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "@/components/ui/GlassCard";
import Flame from "@/components/ui/Flame";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useTheme } from "@/theme/useTheme";
import { accents } from "@/theme/colors";
import { useSettingsStore } from "@/stores/settingsStore";
import { computeStreakDays } from "@/utils/gamification";
import { longestStreak, pointsToday, streakMessage, weekStreakDots } from "@/utils/streak";
import type { Ride } from "@/types/ride";

/** Duolingo-style streak + daily goal card. */
export default function StreakCard({ rides, entranceDelay = 0 }: { rides: Ride[]; entranceDelay?: number }) {
  const { colors } = useTheme();
  const dailyGoal = useSettingsStore((s) => s.dailyGoalPoints);
  const current = useMemo(() => computeStreakDays(rides.map((r) => new Date(r.startedAt))), [rides]);
  const best = useMemo(() => longestStreak(rides), [rides]);
  const dots = useMemo(() => weekStreakDots(rides), [rides]);
  const today = useMemo(() => pointsToday(rides), [rides]);
  const rodeToday = !dots.some((d) => d.status === "today");

  return (
    <GlassCard entranceDelay={entranceDelay}>
      <View style={styles.top}>
        <Flame size={46} lit={current > 0} />
        <View style={{ flex: 1 }}>
          <View style={styles.countRow}>
            <AnimatedNumber value={current} style={[styles.count, { color: current > 0 ? accents.orange.base : colors.inkFaint }]} />
            <Text style={[styles.countLabel, { color: colors.ink }]}>{current === 1 ? "día de racha" : "días de racha"}</Text>
          </View>
          <Text style={{ color: colors.inkSoft, fontSize: 13 }}>{streakMessage(current, rodeToday)}</Text>
        </View>
      </View>

      <View style={styles.week}>
        {dots.map((d, i) => (
          <View key={i} style={styles.dayCol}>
            <Text style={[styles.dayLabel, { color: d.status === "today" ? accents.orange.base : colors.inkFaint }]}>{d.label}</Text>
            {d.status === "done" ? (
              <Animated.View entering={ZoomIn.delay(entranceDelay + 150 + i * 60).springify().damping(16)} style={[styles.dot, { backgroundColor: accents.orange.base, borderColor: accents.orange.lip }]}>
                <Ionicons name="checkmark" size={15} color="#fff" />
              </Animated.View>
            ) : (
              <View
                style={[
                  styles.dot,
                  d.status === "today"
                    ? { borderColor: accents.orange.base, borderStyle: "dashed", backgroundColor: accents.orange.soft }
                    : { borderColor: "#E3E7E1", backgroundColor: d.status === "missed" ? "#F1F3EF" : "#FFFFFF" },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      <View style={styles.goalHead}>
        <Text style={{ color: colors.ink, fontWeight: "700" }}>Meta diaria</Text>
        <Text style={{ color: colors.inkSoft, fontWeight: "700" }}>
          {Math.min(today, dailyGoal)} / {dailyGoal} pts
        </Text>
      </View>
      <DuoProgressBar value={today / dailyGoal} accent="gold" delay={entranceDelay + 300} />
      <Text style={{ color: colors.inkFaint, fontSize: 11.5, marginTop: 8 }}>Mejor racha: {best} {best === 1 ? "día" : "días"}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 14 },
  countRow: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  count: { fontSize: 34, fontWeight: "700", letterSpacing: -1 },
  countLabel: { fontSize: 15, fontWeight: "700" },
  week: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, marginBottom: 16 },
  dayCol: { alignItems: "center", gap: 6, flex: 1 },
  dayLabel: { fontSize: 12, fontWeight: "700" },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  goalHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
});
