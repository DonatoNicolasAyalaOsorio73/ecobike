import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import RideMap from "@/components/map/RideMap";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassSurface from "@/components/ui/GlassSurface";
import GlassButton from "@/components/ui/GlassButton";
import ProgressRing from "@/components/ui/ProgressRing";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useTheme } from "@/theme/useTheme";
import { useRideStore } from "@/stores/rideStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { formatDistance, formatDuration, formatSpeed } from "@/utils/format";
import { distanceThisWeek } from "@/utils/rideStats";

export default function MapScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const units = useSettingsStore((s) => s.units);
  const weeklyGoalKm = useSettingsStore((s) => s.weeklyGoalKm);
  const { points: availablePoints } = useAvailablePoints(userId);
  const { rides, refresh: refreshStats } = useRiderStats(userId);
  const {
    status,
    ride,
    error,
    currentLocation,
    justUnlocked,
    startRide,
    pauseRide,
    resumeRide,
    finishRide,
    discardRide,
    clearJustUnlocked,
    recoverInProgressRide,
  } = useRideStore();

  useEffect(() => {
    if (userId && status === "IDLE") recoverInProgressRide(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Finishing a ride writes it to local storage, so the weekly-goal ring on
  // the idle card has to re-read history to reflect the ride just completed.
  useEffect(() => {
    if (status === "COMPLETED") refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const route = ride?.points.map((p) => ({ lat: p.lat, lng: p.lng })) ?? [];
  const weekKm = distanceThisWeek(rides) / 1000;
  const goalProgress = weeklyGoalKm > 0 ? weekKm / weeklyGoalKm : 0;

  return (
    <View style={styles.screen}>
      {/* The map only covers the top portion; without this the area below it
          was bare black instead of the same glass background every other
          screen sits on. */}
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <RideMap route={route} center={currentLocation} height={status === "IDLE" ? 420 : 300} />

        <View style={styles.pointsPillWrap} pointerEvents="none">
          <GlassSurface radius={999} intensity={45} style={styles.pointsPill}>
            <Ionicons name="ribbon-outline" size={14} color={colors.primaryDark} />
            <AnimatedNumber
              value={availablePoints}
              style={{ color: colors.ink, fontWeight: "700", fontSize: 12.5, marginLeft: 6 }}
              format={(v) => `${v} puntos`}
            />
          </GlassSurface>
        </View>

        <View style={styles.overlay}>
          {status === "IDLE" && (
            <GlassCard>
              <View style={styles.idleRow}>
                <ProgressRing progress={goalProgress} size={78} thickness={9}>
                  <AnimatedNumber
                    value={Math.round(Math.min(999, goalProgress * 100))}
                    style={{ fontSize: 16, fontWeight: "800", color: colors.ink }}
                    format={(v) => `${v}%`}
                  />
                </ProgressRing>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: colors.ink }]}>Listo para pedalear</Text>
                  <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
                    {goalProgress >= 1
                      ? `Meta semanal cumplida: ${weekKm.toFixed(1)} km de ${weeklyGoalKm} km.`
                      : `Te faltan ${Math.max(0, weeklyGoalKm - weekKm).toFixed(1)} km para tu meta semanal.`}
                  </Text>
                </View>
              </View>

              <GlassButton
                label="Iniciar recorrido"
                icon="play"
                variant="primary"
                onPress={() => userId && startRide(userId)}
                disabled={!userId}
                style={{ marginTop: 14 }}
              />
            </GlassCard>
          )}

          {status === "PREPARING" && (
            <GlassCard>
              <Text style={[styles.title, { color: colors.ink }]}>Obteniendo tu ubicación…</Text>
            </GlassCard>
          )}

          {status === "ERROR" && (
            <GlassCard>
              <Text style={[styles.title, { color: colors.danger }]}>No se pudo iniciar</Text>
              <Text style={[styles.subtitle, { color: colors.inkSoft }]}>{error}</Text>
              <GlassButton label="Reintentar" icon="refresh" variant="secondary" onPress={() => userId && startRide(userId)} style={{ marginTop: 12 }} />
            </GlassCard>
          )}

          {(status === "ACTIVE" || status === "PAUSED") && ride && (
            <GlassCard>
              {status === "PAUSED" && (
                <View style={[styles.pausedPill, { backgroundColor: colors.glassFillStrong, borderColor: colors.warning }]}>
                  <Ionicons name="pause" size={12} color={colors.warning} />
                  <Text style={{ color: colors.warning, fontSize: 11.5, fontWeight: "800", marginLeft: 5 }}>EN PAUSA</Text>
                </View>
              )}

              <View style={styles.statsRow}>
                <Stat label="Distancia" value={formatDistance(ride.distanceMeters, units)} colorInk={colors.ink} colorSoft={colors.inkSoft} />
                <Stat label="Duración" value={formatDuration(ride.durationSeconds)} colorInk={colors.ink} colorSoft={colors.inkSoft} />
                <Stat label="Vel. promedio" value={formatSpeed(ride.avgSpeedKmh, units)} colorInk={colors.ink} colorSoft={colors.inkSoft} />
              </View>

              <View style={[styles.secondaryStatsRow, { borderTopColor: colors.divider }]}>
                <Stat label="Vel. máx." value={formatSpeed(ride.maxSpeedKmh, units)} colorInk={colors.inkSoft} colorSoft={colors.inkFaint} />
                <Stat label="Desnivel" value={`${Math.round(ride.elevationGainMeters)} m`} colorInk={colors.inkSoft} colorSoft={colors.inkFaint} />
                <Stat label="Calorías" value={`${ride.caloriesKcal} kcal`} colorInk={colors.inkSoft} colorSoft={colors.inkFaint} />
              </View>

              <View style={styles.controlsRow}>
                {status === "ACTIVE" ? (
                  <GlassButton label="Pausar" icon="pause" variant="secondary" onPress={pauseRide} style={{ flex: 1 }} />
                ) : (
                  <GlassButton label="Reanudar" icon="play" variant="secondary" onPress={resumeRide} style={{ flex: 1 }} />
                )}
                <GlassButton label="Finalizar" icon="flag" variant="primary" onPress={finishRide} style={{ flex: 1 }} />
              </View>
              <Text style={[styles.discard, { color: colors.danger }]} onPress={discardRide}>
                Descartar recorrido
              </Text>
            </GlassCard>
          )}

          {status === "COMPLETED" && ride && (
            <GlassCard>
              <View style={styles.doneHeader}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={[styles.title, { color: colors.ink }]}>¡Recorrido completado!</Text>
              </View>
              <View style={styles.statsRow}>
                <Stat label="Distancia" value={formatDistance(ride.distanceMeters, units)} colorInk={colors.ink} colorSoft={colors.inkSoft} />
                <Stat label="Duración" value={formatDuration(ride.durationSeconds)} colorInk={colors.ink} colorSoft={colors.inkSoft} />
                <Stat label="Puntos" value={`+${ride.pointsEarned}`} colorInk={colors.primaryDark} colorSoft={colors.inkSoft} />
              </View>

              {justUnlocked.length > 0 && (
                <View style={[styles.achievementBanner, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                  <Ionicons name="trophy" size={16} color={colors.primaryDark} />
                  <Text style={[styles.achievementText, { color: colors.primaryDark }]}>
                    Nuevo logro: {justUnlocked.map((a) => a.title).join(", ")}
                  </Text>
                </View>
              )}

              <GlassButton
                label="Listo"
                icon="checkmark"
                variant="primary"
                onPress={() => {
                  clearJustUnlocked();
                  discardRide();
                }}
                style={{ marginTop: 12 }}
              />
            </GlassCard>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, colorInk, colorSoft }: { label: string; value: string; colorInk: string; colorSoft: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: "800", color: colorInk }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colorSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  pointsPillWrap: { position: "absolute", top: 12, left: 0, right: 0, alignItems: "center", zIndex: 5 },
  pointsPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9 },
  overlay: { flex: 1, paddingHorizontal: 16, marginTop: -40 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  secondaryStatsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  idleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  pausedPill: { flexDirection: "row", alignItems: "center", alignSelf: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginBottom: 12 },
  controlsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  discard: { textAlign: "center", marginTop: 12, fontSize: 12.5, fontWeight: "600" },
  doneHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  achievementBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, padding: 10, marginTop: 14 },
  achievementText: { fontSize: 12.5, fontWeight: "700", flex: 1 },
});
