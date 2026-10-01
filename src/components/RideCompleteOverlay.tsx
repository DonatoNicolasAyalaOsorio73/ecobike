import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AppModal from "@/components/ui/AppModal";
import GlassButton from "@/components/ui/GlassButton";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import Flame from "@/components/ui/Flame";
import Confetti from "@/components/ui/Confetti";
import { accents, type AccentName } from "@/theme/colors";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDuration } from "@/utils/format";
import { goalLabel, type RideGoal } from "@/utils/rideGoals";
import type { Ride } from "@/types/ride";
import type { AchievementDef } from "@/types/achievement";

interface Props {
  ride: Ride;
  streak: number;
  pointsToday: number;
  goal: RideGoal | null;
  goalReached: boolean;
  unlocked: AchievementDef[];
  onClose: () => void;
}

function StatBox({ accent, label, children, delay }: { accent: AccentName; label: string; children: React.ReactNode; delay: number }) {
  const a = accents[accent];
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify().damping(11)} style={[styles.box, { borderColor: a.base, backgroundColor: a.base }]}>
      <Text style={styles.boxLabel}>{label}</Text>
      <View style={styles.boxBody}>{children}</View>
    </Animated.View>
  );
}

/** Full-screen "ride complete" celebration (Duolingo lesson-complete style). */
export default function RideCompleteOverlay({ ride, streak, pointsToday, goal, goalReached, unlocked, onClose }: Props) {
  const dailyGoal = useSettingsStore((s) => s.dailyGoalPoints);
  const units = useSettingsStore((s) => s.units);
  const km = ride.distanceMeters / 1000;
  const shownDistance = units === "metric" ? km : km * 0.621371;

  return (
    <AppModal visible onRequestClose={onClose}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={ZoomIn.springify().damping(7).mass(0.8)} style={[styles.hero, { backgroundColor: accents.gold.soft, borderColor: accents.gold.base }]}>
            <Ionicons name="trophy" size={64} color={accents.gold.base} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(180).springify()} style={styles.title}>
            ¡Recorrido completado!
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(260).springify()} style={styles.subtitle}>
            {goal ? (goalReached ? `Cumpliste tu meta de ${goalLabel(goal)}.` : `Meta de ${goalLabel(goal)}: casi lo logras.`) : "Cada kilómetro cuenta. ¡Bien hecho!"}
          </Animated.Text>

          <View style={styles.boxes}>
            <StatBox accent="blue" label="DISTANCIA" delay={360}>
              <AnimatedNumber value={Math.round(shownDistance * 100)} style={[styles.boxValue, { color: accents.blue.base }]} format={(v) => `${(v / 100).toFixed(2)}`} />
              <Text style={[styles.boxUnit, { color: accents.blue.base }]}>{units === "metric" ? "km" : "mi"}</Text>
            </StatBox>
            <StatBox accent="purple" label="TIEMPO" delay={460}>
              <Text style={[styles.boxValue, { color: accents.purple.base, fontSize: 20 }]}>{formatDuration(ride.durationSeconds)}</Text>
            </StatBox>
            <StatBox accent="gold" label="PUNTOS" delay={560}>
              <AnimatedNumber value={ride.pointsEarned} style={[styles.boxValue, { color: accents.gold.lip }]} format={(v) => `+${v}`} />
            </StatBox>
          </View>

          <Animated.View entering={FadeInDown.delay(680).springify()} style={styles.streakRow}>
            <Flame size={30} lit={streak > 0} />
            <Text style={styles.streakText}>
              {streak} {streak === 1 ? "día" : "días"} de racha
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(760).springify()} style={styles.goalBlock}>
            <View style={styles.goalHead}>
              <Text style={styles.goalTitle}>Meta diaria</Text>
              <Text style={styles.goalValue}>
                {Math.min(pointsToday, dailyGoal)} / {dailyGoal} pts
              </Text>
            </View>
            <DuoProgressBar value={pointsToday / dailyGoal} accent="gold" delay={900} />
          </Animated.View>

          {unlocked.map((a, i) => (
            <Animated.View key={a.code} entering={ZoomIn.delay(1000 + i * 150).springify().damping(10)} style={styles.achievement}>
              <View style={[styles.achievementIcon, { backgroundColor: accents.green.soft, borderColor: accents.green.base }]}>
                <Ionicons name={a.icon as any} size={24} color={accents.green.lip} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achievementKicker}>¡NUEVO LOGRO!</Text>
                <Text style={styles.achievementTitle}>{a.title}</Text>
                <Text style={styles.achievementDesc}>{a.description}</Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <GlassButton
            label="Ver detalle"
            variant="secondary"
            icon="map-outline"
            onPress={() => {
              onClose();
              router.push(`/ride/${ride.id}`);
            }}
            style={{ flex: 1 }}
          />
          <GlassButton label="Continuar" onPress={onClose} style={{ flex: 1 }} />
        </View>
        <Confetti count={36} />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { alignItems: "center", paddingHorizontal: 22, paddingTop: 80, paddingBottom: 40 },
  hero: { width: 128, height: 128, borderRadius: 64, alignItems: "center", justifyContent: "center", borderWidth: 4 },
  title: { fontSize: 28, fontWeight: "900", color: "#1F2A22", marginTop: 20, textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: "#6B776F", marginTop: 6, textAlign: "center" },
  boxes: { flexDirection: "row", gap: 10, marginTop: 26, alignSelf: "stretch" },
  box: { flex: 1, borderRadius: 16, borderWidth: 2, overflow: "hidden" },
  boxLabel: { color: "#fff", fontWeight: "900", fontSize: 11.5, textAlign: "center", paddingVertical: 5, letterSpacing: 0.6 },
  boxBody: { backgroundColor: "#fff", paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 3, borderRadius: 13, minHeight: 64 },
  boxValue: { fontSize: 24, fontWeight: "900" },
  boxUnit: { fontSize: 13, fontWeight: "800", alignSelf: "flex-end", marginBottom: 3 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24 },
  streakText: { fontSize: 18, fontWeight: "900", color: accents.orange.base },
  goalBlock: { alignSelf: "stretch", marginTop: 22 },
  goalHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  goalTitle: { fontWeight: "800", color: "#1F2A22" },
  goalValue: { fontWeight: "700", color: "#6B776F" },
  achievement: { flexDirection: "row", alignItems: "center", gap: 12, alignSelf: "stretch", marginTop: 14, padding: 14, borderRadius: 18, borderWidth: 2, borderColor: "#E5EAE2", backgroundColor: "#FBFDF9" },
  achievementIcon: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  achievementKicker: { color: accents.green.base, fontWeight: "900", fontSize: 11, letterSpacing: 0.6 },
  achievementTitle: { color: "#1F2A22", fontWeight: "800", fontSize: 15.5, marginTop: 2 },
  achievementDesc: { color: "#6B776F", fontSize: 12.5, marginTop: 1 },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34, borderTopWidth: 2, borderTopColor: "#EEF1EC", backgroundColor: "#fff" },
});
