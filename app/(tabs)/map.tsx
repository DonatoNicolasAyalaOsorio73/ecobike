import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Animated, { FadeIn, FadeInDown, FadeOutDown, ZoomIn, useAnimatedStyle, withSpring } from "react-native-reanimated";
import RideMap from "@/components/map/RideMap";
import RideOptionsMenu from "@/components/map/RideOptionsMenu";
import GlassCard from "@/components/ui/GlassCard";
import GlassSurface from "@/components/ui/GlassSurface";
import GlassButton from "@/components/ui/GlassButton";
import GlassIconButton from "@/components/ui/GlassIconButton";
import ProgressRing from "@/components/ui/ProgressRing";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import PulseDot from "@/components/ui/PulseDot";
import Confetti from "@/components/ui/Confetti";
import { useTheme } from "@/theme/useTheme";
import { SPRING } from "@/theme/motion";
import { useRideStore } from "@/stores/rideStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { formatDistance, formatDuration, formatSpeed } from "@/utils/format";
import { distanceThisWeek } from "@/utils/rideStats";
import { goalLabel, goalProgress } from "@/utils/rideGoals";

type LatLng = { lat: number; lng: number };

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
    goal,
    goalReached,
    autoPaused,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [idleCenter, setIdleCenter] = useState<LatLng | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);

  useEffect(() => {
    if (userId && status === "IDLE") recoverInProgressRide(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (status === "COMPLETED") refreshStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Center on the rider when we already have permission. Never prompt on
  // screen open: the location prompt appears only when they start a ride or
  // tap "locate me".
  useEffect(() => {
    locate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function locate(ask: boolean) {
    try {
      let { status: perm } = await Location.getForegroundPermissionsAsync();
      if (perm !== "granted" && ask) perm = (await Location.requestForegroundPermissionsAsync()).status;
      if (perm !== "granted") return;
      const pos = (await Location.getLastKnownPositionAsync().catch(() => null)) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      setIdleCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setRecenterKey((k) => k + 1);
    } catch {
      // Location unavailable (browser blocked, GPS off): the map just stays where it is.
    }
  }

  const begin = (g: Parameters<typeof startRide>[1]) => {
    setMenuOpen(false);
    if (userId) startRide(userId, g);
  };

  const route = ride?.points.map((p) => ({ lat: p.lat, lng: p.lng })) ?? [];
  const center = currentLocation ?? idleCenter;
  const weekKm = distanceThisWeek(rides) / 1000;
  const weekProgress = weeklyGoalKm > 0 ? weekKm / weeklyGoalKm : 0;
  const riding = status === "ACTIVE" || status === "PAUSED";
  const rideGoalProgress = goal && ride ? goalProgress(goal, ride) : 0;

  // The bottom card slides down and fades while the options menu is open,
  // so the map and the menu are what you see.
  const cardStyle = useAnimatedStyle(() => ({
    opacity: withSpring(menuOpen ? 0 : 1, SPRING.default),
    transform: [{ translateY: withSpring(menuOpen ? 40 : 0, SPRING.default) }],
  }));

  return (
    <View style={styles.screen}>
      <RideMap route={route} center={center} fill recenterKey={recenterKey} />



      <Animated.View style={[styles.bottom, cardStyle]} pointerEvents={menuOpen ? "none" : "box-none"}>
        {status === "IDLE" && (
          <GlassCard intensity={55}>
            <View style={styles.idleRow}>
              <ProgressRing progress={weekProgress} size={72} thickness={8}>
                <AnimatedNumber
                  value={Math.round(Math.min(999, weekProgress * 100))}
                  style={{ fontSize: 15, fontWeight: "800", color: colors.ink }}
                  format={(v) => `${v}%`}
                />
              </ProgressRing>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.ink }]}>Listo para pedalear</Text>
                <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
                  {weekProgress >= 1
                    ? `Meta semanal cumplida: ${weekKm.toFixed(1)} de ${weeklyGoalKm} km.`
                    : `Te faltan ${Math.max(0, weeklyGoalKm - weekKm).toFixed(1)} km para tu meta semanal.`}
                </Text>
              </View>
            </View>
            <View style={styles.controlsRow}>
              <GlassButton label="Iniciar" icon="play" variant="primary" onPress={() => begin(null)} disabled={!userId} style={{ flex: 1 }} />
              <GlassButton label="Con meta" icon="flag-outline" variant="secondary" onPress={() => setMenuOpen(true)} style={{ flex: 1 }} />
            </View>
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
            <GlassButton label="Reintentar" icon="refresh" variant="secondary" onPress={() => begin(goal)} style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        {riding && ride && (
          <Animated.View entering={FadeInDown.springify().damping(18)} exiting={FadeOutDown}>
            <GlassCard intensity={55}>
              {goal && (
                <View style={styles.goalRow}>
                  <ProgressRing progress={rideGoalProgress} size={54} thickness={6}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.ink }}>{Math.round(rideGoalProgress * 100)}%</Text>
                  </ProgressRing>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: "800" }}>
                      {goalReached ? "Meta alcanzada" : `Meta: ${goalLabel(goal)}`}
                    </Text>
                    <Text style={{ color: colors.inkSoft, fontSize: 12 }}>
                      {goalReached ? "Sigue si quieres, o finaliza cuando estés listo." : "Te avisamos con una vibración al llegar."}
                    </Text>
                  </View>
                  {goalReached && <Ionicons name="trophy" size={22} color={colors.primaryDark} />}
                </View>
              )}

              <View style={styles.statsRow}>
                <Stat big label="Distancia" value={formatDistance(ride.distanceMeters, units)} />
                <Stat big label="Duración" value={formatDuration(ride.durationSeconds)} />
              </View>
              <View style={[styles.secondaryStatsRow, { borderTopColor: colors.divider }]}>
                <Stat label="Vel. prom." value={formatSpeed(ride.avgSpeedKmh, units)} />
                <Stat label="Vel. máx." value={formatSpeed(ride.maxSpeedKmh, units)} />
                <Stat label="Desnivel" value={`${Math.round(ride.elevationGainMeters)} m`} />
              </View>

              <View style={styles.controlsRow}>
                {status === "ACTIVE" ? (
                  <GlassButton label="Pausar" icon="pause" variant="secondary" onPress={pauseRide} style={{ flex: 1 }} />
                ) : (
                  <GlassButton label="Reanudar" icon="play" variant="secondary" onPress={resumeRide} style={{ flex: 1 }} />
                )}
                <GlassButton label="Finalizar" icon="flag" variant="primary" onPress={finishRide} style={{ flex: 1 }} />
              </View>
              <Text style={[styles.discard, { color: colors.danger }]} onPress={discardRide} accessibilityRole="button">
                Descartar recorrido
              </Text>
            </GlassCard>
          </Animated.View>
        )}

        {status === "COMPLETED" && ride && (
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <GlassCard intensity={55}>
              <View style={styles.doneHeader}>
                <Ionicons name="checkmark-circle" size={30} color={colors.success} />
                <Text style={[styles.title, { color: colors.ink }]}>¡Recorrido completado!</Text>
              </View>
              <View style={styles.statsRow}>
                <Stat label="Distancia" value={formatDistance(ride.distanceMeters, units)} />
                <Stat label="Duración" value={formatDuration(ride.durationSeconds)} />
                <Stat label="Puntos" value={`+${ride.pointsEarned}`} accent />
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
          </Animated.View>
        )}
      </Animated.View>

      {status === "COMPLETED" && <Confetti />}

      {/* Layers: map < ride card < options menu (frosted) < top controls */}
      {menuOpen && <RideOptionsMenu onSelect={begin} onClose={() => setMenuOpen(false)} />}

      <SafeAreaView style={styles.safe} edges={["top"]} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(400)}>
            <GlassSurface radius={999} intensity={55} backgroundColor={colors.glassFillStrong} style={styles.pointsPill}>
              <Ionicons name="ribbon-outline" size={14} color={colors.primaryDark} />
              <AnimatedNumber
                value={availablePoints}
                style={{ color: colors.ink, fontWeight: "800", fontSize: 13, marginLeft: 6 }}
                format={(v) => `${v.toLocaleString("es-CO")} pts`}
              />
            </GlassSurface>
          </Animated.View>
          {riding && (
            <Animated.View entering={ZoomIn.springify()}>
              <GlassSurface radius={999} intensity={55} backgroundColor={colors.glassFillStrong} style={styles.pointsPill}>
                <PulseDot color={status === "ACTIVE" ? colors.danger : colors.warning} active={status === "ACTIVE"} />
                <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 12, marginLeft: 8 }}>
                  {status === "ACTIVE" ? "GRABANDO" : autoPaused ? "PAUSA AUTO" : "EN PAUSA"}
                </Text>
              </GlassSurface>
            </Animated.View>
          )}
        </View>

        <View style={styles.rail} pointerEvents="box-none">
          <GlassIconButton icon="locate" accessibilityLabel="Centrar en mi ubicación" onPress={() => locate(true)} />
          {status === "IDLE" && (
            <GlassIconButton
              icon={menuOpen ? "close" : "options"}
              accessibilityLabel={menuOpen ? "Cerrar opciones de recorrido" : "Opciones de recorrido"}
              active={menuOpen}
              onPress={() => setMenuOpen((o) => !o)}
              size={56}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function Stat({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: big ? 26 : 15, fontWeight: "800", color: accent ? colors.primaryDark : colors.ink, letterSpacing: big ? -0.5 : 0 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  safe: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  topRow: { flexDirection: "row", justifyContent: "center", gap: 8, paddingTop: 10 },
  pointsPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9 },
  rail: { position: "absolute", right: 14, top: 120, gap: 12, alignItems: "center" },
  bottom: { position: "absolute", left: 14, right: 14, bottom: 104 },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  idleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  secondaryStatsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  controlsRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  discard: { textAlign: "center", marginTop: 12, fontSize: 12.5, fontWeight: "600" },
  doneHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  achievementBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, padding: 10, marginTop: 14 },
  achievementText: { fontSize: 12.5, fontWeight: "700", flex: 1 },
});
