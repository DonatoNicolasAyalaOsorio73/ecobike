import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "@/components/ui/GlassCard";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import { useTheme } from "@/theme/useTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { dailyMissions, renewsIn } from "@/utils/missions";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import type { Ride } from "@/types/ride";

/** Duolingo-style daily quests computed from today's rides. */
export default function MissionsCard({ rides, entranceDelay = 0 }: { rides: Ride[]; entranceDelay?: number }) {
  const { colors } = useTheme();
  const dailyGoal = useSettingsStore((s) => s.dailyGoalPoints);
  const userId = useCurrentUserId();
  // A minute tick: the countdown moves and a new day's missions appear at
  // midnight even if the screen stays open.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const day = now.toDateString();
  // Drawn per user and day; only verified rides count (see utils/missions.ts).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const missions = useMemo(() => dailyMissions(rides, dailyGoal, new Date(), userId ?? ""), [rides, dailyGoal, userId, day]);
  const done = missions.filter((m) => m.done).length;

  return (
    <GlassCard entranceDelay={entranceDelay}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]}>Misiones de hoy</Text>
          <Text style={{ color: colors.inkSoft, fontSize: 12 }}>Nuevas en {renewsIn(now)} · solo cuentan recorridos verificados</Text>
        </View>
        <View style={[styles.counter, { backgroundColor: done === missions.length ? colors.primary : colors.chipFill }]}>
          <Ionicons name="star" size={12} color={colors.ink} />
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 12 }}>
            {done}/{missions.length}
          </Text>
        </View>
      </View>
      {missions.map((m, i) => {
        return (
          <View key={m.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            {/* Lime = done (state); pending missions stay neutral. */}
            <View style={[styles.icon, { backgroundColor: m.done ? colors.primary : colors.chipFill }]}>
              <Ionicons name={(m.done ? "checkmark" : m.icon) as any} size={20} color={colors.ink} />
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.labelRow}>
                <Text style={[styles.mTitle, { color: colors.ink }]} numberOfLines={2}>
                  {m.title}
                </Text>
                <Text style={{ color: colors.inkSoft, fontSize: 12, fontWeight: "700" }}>
                  {m.current}/{m.target}
                  {m.unit ? ` ${m.unit}` : ""}
                </Text>
              </View>
              <DuoProgressBar value={m.current / m.target} accent="green" delay={entranceDelay + 150 + i * 90} />
            </View>
            {m.done && (
              <Animated.View entering={ZoomIn.delay(entranceDelay + 300 + i * 90).springify().damping(16)} style={styles.chest}>
                <Ionicons name="trophy" size={18} color={colors.ink} />
              </Animated.View>
            )}
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 16, fontWeight: "700" },
  counter: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  mTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  chest: { width: 28, alignItems: "center" },
});
