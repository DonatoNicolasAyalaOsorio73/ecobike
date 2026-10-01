import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import GlassCard from "@/components/ui/GlassCard";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import { useTheme } from "@/theme/useTheme";
import { accents } from "@/theme/colors";
import { useSettingsStore } from "@/stores/settingsStore";
import { dailyMissions } from "@/utils/missions";
import type { Ride } from "@/types/ride";

/** Duolingo-style daily quests computed from today's rides. */
export default function MissionsCard({ rides, entranceDelay = 0 }: { rides: Ride[]; entranceDelay?: number }) {
  const { colors } = useTheme();
  const dailyGoal = useSettingsStore((s) => s.dailyGoalPoints);
  const missions = useMemo(() => dailyMissions(rides, dailyGoal), [rides, dailyGoal]);
  const done = missions.filter((m) => m.done).length;

  return (
    <GlassCard entranceDelay={entranceDelay}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.ink }]}>Misiones de hoy</Text>
        <View style={[styles.counter, { backgroundColor: done === missions.length ? accents.gold.base : accents.gold.soft }]}>
          <Ionicons name="star" size={12} color={done === missions.length ? "#fff" : accents.gold.lip} />
          <Text style={{ color: done === missions.length ? "#fff" : accents.gold.lip, fontWeight: "900", fontSize: 12 }}>
            {done}/{missions.length}
          </Text>
        </View>
      </View>
      {missions.map((m, i) => {
        const a = accents[m.accent];
        return (
          <View key={m.id} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <View style={[styles.icon, { backgroundColor: m.done ? a.base : a.soft, borderColor: a.base }]}>
              <Ionicons name={(m.done ? "checkmark" : m.icon) as any} size={20} color={m.done ? "#fff" : a.lip} />
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
              <DuoProgressBar value={m.current / m.target} accent={m.accent} height={12} delay={entranceDelay + 150 + i * 90} />
            </View>
            {m.done && (
              <Animated.View entering={ZoomIn.delay(entranceDelay + 300 + i * 90).springify().damping(9)} style={styles.chest}>
                <Ionicons name="trophy" size={18} color={accents.gold.base} />
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
  title: { fontSize: 16, fontWeight: "900" },
  counter: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  mTitle: { fontSize: 14, fontWeight: "800", flex: 1 },
  chest: { width: 28, alignItems: "center" },
});
