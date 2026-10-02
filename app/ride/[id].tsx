import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { ZoomIn } from "react-native-reanimated";
import { enter } from "@/theme/motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import RideMap from "@/components/map/RideMap";
import GlassCard from "@/components/ui/GlassCard";
import BackButton from "@/components/ui/BackButton";
import StatTile from "@/components/ui/StatTile";
import SegmentedControl from "@/components/ui/SegmentedControl";
import AreaChart from "@/components/charts/AreaChart";
import { useTheme } from "@/theme/useTheme";
import { accents } from "@/theme/colors";
import { useSettingsStore } from "@/stores/settingsStore";
import { getRide } from "@/services/db";
import { formatDistance, formatDuration, formatSpeed, sentenceCase } from "@/utils/format";
import { environmentalImpact } from "@/utils/rideStats";
import { kmSplits, rideProfile } from "@/utils/rideAnalysis";
import type { Ride } from "@/types/ride";
import GlassButton from "@/components/ui/GlassButton";
import { shareText } from "@/services/share";
import { rideShareText } from "@/utils/shareText";
import { useToastStore } from "@/stores/toastStore";

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const units = useSettingsStore((s) => s.units);
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);
  const [chart, setChart] = useState<"speed" | "altitude">("speed");
  const toast = useToastStore((s) => s.show);

  useEffect(() => {
    if (id) setRide(getRide(id));
  }, [id]);

  const profile = useMemo(() => (ride ? rideProfile(ride.points, 36) : { speed: [], altitude: [] }), [ride]);
  const splits = useMemo(() => (ride ? kmSplits(ride.points) : []), [ride]);

  if (ride === undefined) return null;
  if (ride === null) {
    return (
      <SafeAreaView style={[styles.safe, { alignItems: "center", justifyContent: "center" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: colors.inkSoft }}>No se encontró este recorrido.</Text>
      </SafeAreaView>
    );
  }

  const route = ride.points.map((p) => ({ lat: p.lat, lng: p.lng }));
  const co2 = environmentalImpact(ride.distanceMeters).co2Kg;
  const maxSplit = Math.max(1, ...splits.map((s) => s.seconds));
  const hasProfile = profile.speed.length > 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgTop }}>
      <Stack.Screen options={{ headerShown: false }} />
      {route.length > 1 ? (
        <RideMap route={route} center={route[route.length - 1] ?? null} height={300} fitRoute />
      ) : (
        // Rides synced from another device carry only the summary (the GPS trace never leaves the phone).
        <View style={[styles.noMap, { backgroundColor: accents.green.soft }]}>
          <Ionicons name="map-outline" size={30} color={accents.green.lip} />
          <Text style={{ color: colors.inkSoft, textAlign: "center", marginTop: 8, paddingHorizontal: 32 }}>
            El trazado del mapa solo está en el dispositivo donde grabaste este recorrido.
          </Text>
        </View>
      )}

      <SafeAreaView style={styles.floatingBack} edges={["top"]}>
        <BackButton />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter()} style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.date, { color: colors.ink }]}>{sentenceCase(format(new Date(ride.startedAt), "EEEE d 'de' MMMM", { locale: es }))}</Text>
            <Text style={{ color: colors.inkSoft }}>
              {format(new Date(ride.startedAt), "HH:mm")}
              {ride.endedAt ? ` – ${format(new Date(ride.endedAt), "HH:mm")}` : ""}
            </Text>
          </View>
          <Animated.View entering={ZoomIn.delay(150).springify().damping(16)} style={[styles.ptsBadge, { backgroundColor: accents.gold.soft, borderColor: "transparent" }]}>
            <Ionicons name="ribbon" size={16} color={accents.gold.lip} />
            <Text style={{ color: accents.gold.lip, fontWeight: "700", fontSize: 16 }}>+{ride.pointsEarned}</Text>
          </Animated.View>
        </Animated.View>

        {ride.pointsReason ? (
          // Why this ride earned less (not a bike ride, daily cap...): never a silent 0.
          <Animated.View entering={enter(60)} style={[styles.reason, { backgroundColor: colors.chipFill }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.inkSoft} />
            <Text style={{ color: colors.inkSoft, flex: 1, fontSize: 13.5 }}>{ride.pointsReason}</Text>
          </Animated.View>
        ) : null}

        <View style={styles.grid}>
          <StatTile icon="speedometer-outline" label="Distancia" value={formatDistance(ride.distanceMeters, units)} />
          <StatTile icon="time-outline" label="Duración" value={formatDuration(ride.durationSeconds)} />
          <StatTile icon="flash-outline" label="Vel. promedio" value={formatSpeed(ride.avgSpeedKmh, units)} />
          <StatTile icon="trending-up-outline" label="Vel. máxima" value={formatSpeed(ride.maxSpeedKmh, units)} />
          <StatTile icon="triangle-outline" label="Desnivel +" value={`${Math.round(ride.elevationGainMeters)} m`} />
          <StatTile icon="flame-outline" label="Calorías" value={`${Math.round(ride.caloriesKcal)} kcal`} />
        </View>

        <GlassCard containerStyle={{ marginTop: 16 }} entranceDelay={80}>
          <View style={styles.co2Row}>
            <View style={[styles.co2Icon, { backgroundColor: accents.teal.soft, borderColor: "transparent" }]}>
              <Ionicons name="leaf" size={20} color={accents.teal.lip} />
            </View>
            <Text style={{ color: colors.ink, flex: 1, fontWeight: "700" }}>
              Evitaste <Text style={{ color: accents.teal.lip, fontWeight: "700" }}>{co2.toFixed(2)} kg de CO₂</Text> frente a ir en carro.
            </Text>
          </View>
        </GlassCard>

        {hasProfile && (
          <>
            <Text style={[styles.section, { color: colors.ink }]}>Perfil del recorrido</Text>
            <GlassCard entranceDelay={120}>
              <SegmentedControl
                options={[
                  { label: "Velocidad", value: "speed" },
                  { label: "Altitud", value: "altitude" },
                ]}
                value={chart}
                onChange={setChart}
                style={{ marginBottom: 12 }}
              />
              <AreaChart
                values={chart === "speed" ? profile.speed : profile.altitude.map((a) => a - Math.min(...profile.altitude))}
                labels={["Inicio", "", "", "", "Fin"]}
                accessibilityLabel={chart === "speed" ? "Velocidad a lo largo del recorrido" : "Altitud a lo largo del recorrido"}
              />
              <Text style={{ color: colors.inkFaint, fontSize: 12, marginTop: 8 }}>
                {chart === "speed"
                  ? `Máxima ${formatSpeed(Math.max(...profile.speed), units)}`
                  : `Entre ${Math.round(Math.min(...profile.altitude))} y ${Math.round(Math.max(...profile.altitude))} m`}
              </Text>
            </GlassCard>
          </>
        )}

        {splits.length > 0 && (
          <>
            <Text style={[styles.section, { color: colors.ink }]}>Parciales por km</Text>
            <GlassCard entranceDelay={160}>
              {splits.map((s, i) => (
                <View key={`${s.km}_${i}`} style={styles.splitRow}>
                  <Text style={[styles.splitKm, { color: colors.ink }]}>{Number.isInteger(s.km) ? s.km : s.km.toFixed(1)}</Text>
                  <View style={styles.splitTrack}>
                    <View
                      style={[
                        styles.splitFill,
                        { width: `${Math.max(12, (s.seconds / maxSplit) * 100)}%`, backgroundColor: s.fastest ? accents.green.base : accents.blue.base },
                      ]}
                    />
                  </View>
                  <Text style={[styles.splitTime, { color: s.fastest ? accents.green.lip : colors.inkSoft }]}>
                    {formatDuration(s.seconds)}
                    {s.fastest ? " ★" : ""}
                  </Text>
                </View>
              ))}
            </GlassCard>
          </>
        )}

        <GlassButton
          label="Compartir recorrido"
          icon="share-social-outline"
          variant="secondary"
          onPress={async () => {
            const r = await shareText(rideShareText(ride, units));
            if (r === "copied") toast("Resumen copiado al portapapeles.", "success");
          }}
          style={{ marginTop: 22 }}
        />

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  reason: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, marginBottom: 12 },
  safe: { flex: 1 },
  floatingBack: { position: "absolute", left: 16, top: 0 },
  content: { padding: 20, paddingTop: 20 },
  headRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  date: { fontSize: 20, fontWeight: "700", },
  ptsBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 2, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  noMap: { height: 220, alignItems: "center", justifyContent: "center", paddingTop: 40 },
  co2Row: { flexDirection: "row", alignItems: "center", gap: 12 },
  co2Icon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  section: { fontSize: 18, fontWeight: "700", marginTop: 22, marginBottom: 10 },
  splitRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  splitKm: { width: 30, fontWeight: "700", fontSize: 13 },
  splitTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: "#EEF1EC", overflow: "hidden" },
  splitFill: { height: "100%", borderRadius: 6 },
  splitTime: { width: 74, textAlign: "right", fontWeight: "700", fontSize: 12.5 },
});
