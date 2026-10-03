import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import Animated, { FadeInDown, FadeOutDown, ZoomIn, useAnimatedStyle, withSpring } from "react-native-reanimated";
import RideMap from "@/components/map/RideMap";
import RideLauncher from "@/components/map/RideLauncher";
import EcoRoutePreview from "@/components/map/EcoRoutePreview";
import NavBanner from "@/components/map/NavBanner";
import { cumulativeMeters, navigate } from "@/domain/navigation";
import * as Haptics from "expo-haptics";
import { planBikeRoute, type BikeRoute, type Place, type RoutePrefs } from "@/services/routing";
import PointsBadge from "@/components/ui/PointsBadge";
import { LIQUID_BORDER, LIQUID_FILL, LIQUID_RIM } from "@/theme/glass";
import MapSheet from "@/components/map/MapSheet";
import GlassCard from "@/components/ui/GlassCard";
import GlassSurface from "@/components/ui/GlassSurface";
import GlassButton from "@/components/ui/GlassButton";
import GlassIconButton from "@/components/ui/GlassIconButton";
import ProgressRing from "@/components/ui/ProgressRing";
import PulseDot from "@/components/ui/PulseDot";
import RideCompleteOverlay from "@/components/ride/RideCompleteOverlay";
import Flame from "@/components/ui/Flame";
import { useTheme } from "@/theme/useTheme";
import { SPRING, enter } from "@/theme/motion";
import { useRideStore } from "@/stores/rideStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { formatDistance, formatDuration, formatSpeed } from "@/utils/format";
import { distanceThisWeek } from "@/domain/rideStats";
import { goalLabel, goalProgress } from "@/domain/rideGoals";
import { pointsToday } from "@/domain/streak";
import { streakDays } from "@/domain/gamification";
import { useLayout } from "@/hooks/useLayout";
import { bearingDegrees, haversineMeters } from "@/utils/geo";

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
  const { desktop, bottomInset } = useLayout();
  const toast = useToastStore((st) => st.show);
  const [menuOpen, setMenuOpen] = useState(false);
  // Panel detent: unfolded by default; the rider can fold it to see more map.
  const [sheetOpen, setSheetOpen] = useState(true);
  const compass = useCompassHeading();
  const [idleCenter, setIdleCenter] = useState<LatLng | null>(null);
  const [recenterKey, setRecenterKey] = useState(0);
  // Points when the ride started → detect a level-up on completion without
  // waiting for the server sync to refresh the balance.
  const startPoints = React.useRef(availablePoints);
  useEffect(() => {
    if (status === "ACTIVE" && ride && ride.durationSeconds < 2) startPoints.current = availablePoints;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  // A newer locate (or leaving the screen) cancels the slow background refine
  // of an older one, so a late fix never yanks the map back after a pan.
  const locateSeq = React.useRef(0);
  useEffect(() => () => void (locateSeq.current = -1), []);

  async function locate(ask: boolean) {
    const seq = ++locateSeq.current;
    const go = (p: Location.LocationObject | null) => {
      if (!p || seq !== locateSeq.current) return false;
      setIdleCenter({ lat: p.coords.latitude, lng: p.coords.longitude });
      setRecenterKey((k) => k + 1);
      return true;
    };
    // Never let one slow fix block the button: each reading gets a deadline.
    const within = <T,>(ms: number, p: Promise<T>) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]).catch(() => null);
    try {
      let { status: perm } = await Location.getForegroundPermissionsAsync();
      if (perm !== "granted" && ask) perm = (await Location.requestForegroundPermissionsAsync()).status;
      if (perm !== "granted") {
        if (ask) toast("Activa el permiso de ubicación para centrar el mapa en ti.", "error");
        return;
      }
      // 1) A cached fix only if it's fresh (an old one can be far away): instant move.
      const recent = await within(1500, Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 150 }));
      const movedFast = go(recent);
      // 2) A quick live fix (Wi-Fi/cell assisted) with a deadline.
      const quick = await within(8000, Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const moved = go(quick) || movedFast;
      // 3) Refine with GPS in the background (can take a while indoors; never blocks).
      within(15000, Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })).then((p) => {
        if (useRideStore.getState().status === "IDLE") go(p);
      });
      // 4) Last resort: any known position, else tell the rider why nothing moved.
      if (!moved && !go(await within(1500, Location.getLastKnownPositionAsync())) && ask) {
        toast("No pudimos obtener tu ubicación. Revisa que el GPS esté activo.", "error");
      }
    } catch {
      if (ask) toast("No pudimos obtener tu ubicación. Revisa que el GPS esté activo.", "error");
    }
  }

  // ─── Eco ruta: preview a planned bike route, then ride it ───
  const [eco, setEco] = useState<{ place: Place; prefs: RoutePrefs; routes: BikeRoute[]; idx: number; loading: boolean; error: string | null } | null>(null);
  // The Eco ruta being ridden (route + where to), for the green path and turn-by-turn.
  const [activeEco, setActiveEco] = useState<{ route: BikeRoute; place: Place; prefs: RoutePrefs } | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  // Only the latest planning request may update the preview (re-picks, new prefs).
  const ecoReq = React.useRef(0);
  const pickEco = async (place: Place, prefs: RoutePrefs) => {
    setMenuOpen(false);
    if (!center) {
      toast("Necesitamos tu ubicación para planear la ruta. Toca el botón de ubicación.", "error");
      return;
    }
    const req = ++ecoReq.current;
    setEco({ place, prefs, routes: [], idx: 0, loading: true, error: null });
    try {
      const routes = await planBikeRoute(center, place, prefs);
      if (req === ecoReq.current) setEco((e) => (e ? { ...e, routes, loading: false } : e));
    } catch (err: any) {
      if (req === ecoReq.current) setEco((e) => (e ? { ...e, loading: false, error: err?.message ?? "No pudimos calcular la ruta." } : e));
    }
  };
  const startEco = () => {
    const r = eco?.routes[eco.idx];
    if (!r || !userId) return; // nothing to ride without an account; the line must not stay on an idle map
    setActiveEco({ route: r, place: eco!.place, prefs: eco!.prefs });
    setEco(null);
    begin({ kind: "distance", meters: Math.max(500, Math.round(r.km * 1000)) });
  };
  // The planned line stays on the map while riding it; it clears once the map is idle again.
  useEffect(() => {
    if (status === "IDLE" && !eco) setActiveEco(null);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = (g: Parameters<typeof startRide>[1]) => {
    setMenuOpen(false);
    if (userId) startRide(userId, g);
  };

  const route = ride?.points.map((p) => ({ lat: p.lat, lng: p.lng })) ?? [];
  // Arrow heading: direction of travel while riding (last two fixes ≥ 3 m apart), else the compass.
  const travelHeading = React.useMemo(() => {
    const pts = ride?.points ?? [];
    for (let i = pts.length - 1; i > 0; i--) {
      const a = pts[i - 1];
      const b = pts[pts.length - 1];
      if (haversineMeters(a, b) >= 3) return bearingDegrees(a, b);
    }
    return null;
  }, [ride?.points.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const heading = travelHeading ?? compass;
  const center = currentLocation ?? idleCenter;
  // Turn-by-turn: where the rider is on the Eco ruta (re-evaluated on each GPS fix).
  const ecoCum = React.useMemo(() => (activeEco ? cumulativeMeters(activeEco.route.points) : null), [activeEco]);
  const nav = React.useMemo(
    () => (activeEco && ecoCum && currentLocation ? navigate(activeEco.route.points, ecoCum, activeEco.route.maneuvers, currentLocation) : null),
    [activeEco, ecoCum, currentLocation]
  );
  // A light tap as each turn comes up (once per turn, within 60 m).
  const announced = React.useRef<number | null>(null);
  useEffect(() => {
    const idx = nav?.next?.beginIndex ?? null;
    if (idx != null && nav!.distanceM <= 60 && announced.current !== idx) {
      announced.current = idx;
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  }, [nav]);
  // A new route means new turns to announce.
  useEffect(() => {
    announced.current = null;
  }, [activeEco?.route]);
  const recalculate = async () => {
    if (!activeEco || !currentLocation || recalculating) return;
    setRecalculating(true);
    try {
      const [route] = await planBikeRoute(currentLocation, activeEco.place, activeEco.prefs);
      // The ride may have ended while this was in flight: never revive the line on an idle map.
      if (route && useRideStore.getState().status !== "IDLE") setActiveEco((a) => (a ? { ...a, route } : a));
    } catch {
      toast("No pudimos recalcular la ruta. Sigue la línea verde.", "error");
    } finally {
      setRecalculating(false);
    }
  };
  const weekKm = distanceThisWeek(rides) / 1000;
  const weekProgress = weeklyGoalKm > 0 ? weekKm / weeklyGoalKm : 0;
  const riding = status === "ACTIVE" || status === "PAUSED";
  const streak = streakDays(rides);
  const rideGoalProgress = goal && ride ? goalProgress(goal, ride) : 0;

  // The bottom card slides down and fades while the options menu is open,
  // so the map and the menu are what you see.
  const cardStyle = useAnimatedStyle(() => ({
    opacity: withSpring(menuOpen ? 0 : 1, SPRING.default),
    transform: [{ translateY: withSpring(menuOpen ? 40 : 0, SPRING.default) }],
  }));

  return (
    <View style={styles.screen}>
      <RideMap
        route={route}
        center={center}
        fill
        recenterKey={recenterKey}
        heading={heading}
        plannedRoute={eco?.routes[eco.idx]?.points ?? activeEco?.route.points ?? undefined}
        fitPlanned={!!eco?.routes.length}
      />



      <Animated.View style={[styles.bottom, desktop ? styles.bottomDesktop : { bottom: bottomInset - 8 }, cardStyle]} pointerEvents={menuOpen ? "none" : "box-none"}>
        {status === "IDLE" && eco && (
          <EcoRoutePreview
            eco={eco}
            onSelect={(idx) => setEco((e) => (e ? { ...e, idx } : e))}
            onCancel={() => setEco(null)}
            onStart={startEco}
          />
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
            <MapSheet
              expanded={sheetOpen}
              onExpandedChange={setSheetOpen}
              compact={
                <View style={styles.compactRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.ink }]}>{formatDistance(ride.distanceMeters, units)}</Text>
                    <Text style={{ color: colors.inkSoft, fontSize: 12 }}>{formatDuration(ride.durationSeconds)}</Text>
                  </View>
                  {status === "ACTIVE" ? (
                    <GlassIconButton icon="pause" accessibilityLabel="Pausar" onPress={pauseRide} size={44} />
                  ) : (
                    <GlassIconButton icon="play" accessibilityLabel="Reanudar" onPress={resumeRide} size={44} />
                  )}
                  <GlassIconButton icon="flag" accessibilityLabel="Finalizar" active onPress={finishRide} size={44} />
                </View>
              }
            >
              {goal && (
                <View style={styles.goalRow}>
                  <ProgressRing progress={rideGoalProgress} size={54} thickness={6}>
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.ink }}>{Math.round(rideGoalProgress * 100)}%</Text>
                  </ProgressRing>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: "700" }}>
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
            </MapSheet>
          </Animated.View>
        )}
      </Animated.View>

      {status === "COMPLETED" && ride && (
        <RideCompleteOverlay
          ride={ride}
          streak={streak}
          pointsToday={pointsToday(rides)}
          goal={goal}
          goalReached={goalReached}
          unlocked={justUnlocked}
          pointsBefore={startPoints.current}
          onClose={() => {
            clearJustUnlocked();
            discardRide();
          }}
        />
      )}

      <SafeAreaView style={styles.safe} edges={["top"]} pointerEvents="box-none">
        {/* Following an Eco ruta: turn-by-turn takes the top of the screen. */}
        {nav && activeEco && riding ? (
          <View style={{ paddingTop: 10 }}>
            <NavBanner nav={nav} destination={activeEco.place.name} recalculating={recalculating} onRecalculate={recalculate} />
          </View>
        ) : (
        <View style={styles.topRow} pointerEvents="box-none">
          <Animated.View entering={enter(80)}>
            <PointsBadge points={availablePoints} today={pointsToday(rides)} />
          </Animated.View>
          <Animated.View entering={enter(160)}>
            <GlassSurface radius={999} intensity={100} specular backgroundColor={LIQUID_FILL} borderColor={LIQUID_BORDER} style={[styles.streakPill, LIQUID_RIM]}>
              <Flame size={20} lit={streak > 0} />
              <View>
                <Text style={{ color: colors.ink, fontWeight: "800", fontSize: 17, letterSpacing: -0.4 }}>{streak}</Text>
                <Text style={{ color: colors.inkSoft, fontWeight: "600", fontSize: 10.5, marginTop: -2 }}>{streak === 1 ? "día" : "días"}</Text>
              </View>
            </GlassSurface>
          </Animated.View>
          {riding && (
            <Animated.View entering={ZoomIn.springify()}>
              <GlassSurface radius={999} intensity={55} backgroundColor={colors.glassFillStrong} style={styles.pointsPill}>
                <PulseDot color={status === "ACTIVE" ? colors.danger : colors.warning} active={status === "ACTIVE"} />
                <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 12, marginLeft: 8 }}>
                  {status === "ACTIVE" ? "GRABANDO" : autoPaused ? "PAUSA AUTO" : "EN PAUSA"}
                </Text>
              </GlassSurface>
            </Animated.View>
          )}
        </View>
        )}

        <View style={styles.rail} pointerEvents="box-none">
          <GlassIconButton liquid icon="navigate" accessibilityLabel="Centrar en mi ubicación" onPress={() => {
            askCompassPermission();
            locate(true);
          }} />
        </View>
      </SafeAreaView>

      {/* Layers: map < ride panel < top controls < launcher (its menu frosts everything below). */}
      {status === "IDLE" && !eco && (
        <RideLauncher
          near={center}
          onEcoPick={pickEco}
          onEcoOpen={() => locate(true)}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onSelect={begin}
          weekProgress={weekProgress}
          disabled={!userId}
          bottom={desktop ? 28 : bottomInset - 2}
        />
      )}
    </View>
  );
}

function Stat({ label, value, big, accent }: { label: string; value: string; big?: boolean; accent?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: big ? 26 : 15, fontWeight: "700", color: accent ? colors.primaryDark : colors.ink, letterSpacing: big ? -0.5 : 0 }}>
        {value}
      </Text>
      <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  safe: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  topRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, paddingTop: 10 },
  pointsPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9 },
  streakPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 12, paddingRight: 16, paddingVertical: 6, minHeight: 46, borderWidth: 1 },
  rail: { position: "absolute", right: 14, top: 120, gap: 12, alignItems: "center" },
  bottom: { position: "absolute", left: 14, right: 14 },
  // Desktop: a floating panel at the leading edge so the map stays the protagonist.
  bottomDesktop: { right: undefined, left: 24, bottom: 24, width: 400 },
  title: { fontSize: 17, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  compactRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  secondaryStatsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  controlsRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  discard: { textAlign: "center", marginTop: 12, fontSize: 12.5, fontWeight: "600" },
  doneHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  achievementBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, padding: 10, marginTop: 14 },
  achievementText: { fontSize: 12.5, fontWeight: "700", flex: 1 },
});

/**
 * Web compass (phones expose it through device orientation; desktops don't).
 * Native maps draw the system location marker, which already shows heading.
 * Throttled: orientation fires ~60 Hz, the arrow only needs a few updates a second.
 */
/**
 * iPhone Safari (13+) only delivers compass events after the page asks, and
 * only from a tap: called from the locate button. No-op everywhere else.
 */
function askCompassPermission() {
  const DOE = typeof window !== "undefined" ? (window as any).DeviceOrientationEvent : undefined;
  if (Platform.OS === "web" && typeof DOE?.requestPermission === "function") DOE.requestPermission().catch(() => {});
}

function useCompassHeading(): number | null {
  const [deg, setDeg] = useState<number | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    let last = 0;
    let lastDeg: number | null = null;
    const on = (e: any) => {
      const h = typeof e.webkitCompassHeading === "number" ? e.webkitCompassHeading : e.absolute && typeof e.alpha === "number" ? 360 - e.alpha : null;
      const now = Date.now();
      if (h == null || now - last < 150) return;
      if (lastDeg != null && Math.abs(((h - lastDeg + 540) % 360) - 180) < 4) return;
      last = now;
      lastDeg = h;
      setDeg(h);
    };
    window.addEventListener("deviceorientationabsolute", on);
    window.addEventListener("deviceorientation", on);
    return () => {
      window.removeEventListener("deviceorientationabsolute", on);
      window.removeEventListener("deviceorientation", on);
    };
  }, []);
  return deg;
}
