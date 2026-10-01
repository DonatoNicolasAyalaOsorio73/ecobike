import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import RideMap from "@/components/map/RideMap";
import GlassCard from "@/components/ui/GlassCard";
import BackButton from "@/components/ui/BackButton";
import StatTile from "@/components/ui/StatTile";
import { useTheme } from "@/theme/useTheme";
import { useSettingsStore } from "@/stores/settingsStore";
import { getRide } from "@/services/db";
import { formatDistance, formatDuration, formatSpeed } from "@/utils/format";
import type { Ride } from "@/types/ride";

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const units = useSettingsStore((s) => s.units);
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);

  useEffect(() => {
    if (id) setRide(getRide(id));
  }, [id]);

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgTop }}>
      <Stack.Screen options={{ headerShown: false }} />
      <RideMap route={route} center={route[route.length - 1] ?? null} height={280} />

      <SafeAreaView style={styles.floatingBack} edges={["top"]}>
        <BackButton />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.date, { color: colors.ink }]}>
          {format(new Date(ride.startedAt), "EEEE d 'de' MMMM, yyyy · HH:mm", { locale: es })}
        </Text>

        <View style={styles.grid}>
          <StatTile icon="speedometer-outline" label="Distancia" value={formatDistance(ride.distanceMeters, units)} accent />
          <StatTile icon="time-outline" label="Duración" value={formatDuration(ride.durationSeconds)} />
          <StatTile icon="flash-outline" label="Vel. promedio" value={formatSpeed(ride.avgSpeedKmh, units)} />
          <StatTile icon="trending-up-outline" label="Vel. máxima" value={formatSpeed(ride.maxSpeedKmh, units)} />
          <StatTile icon="triangle-outline" label="Desnivel +" value={`${Math.round(ride.elevationGainMeters)} m`} />
          <StatTile icon="flame-outline" label="Calorías" value={`${Math.round(ride.caloriesKcal)} kcal`} />
        </View>

        <GlassCard style={{ marginTop: 16, marginBottom: 40 }}>
          <View style={styles.pointsRow}>
            <Ionicons name="trophy-outline" size={18} color={colors.primaryDark} />
            <Text style={[styles.pointsText, { color: colors.ink }]}>+{ride.pointsEarned} puntos ganados</Text>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  floatingBack: { position: "absolute", left: 16, top: 0 },
  content: { padding: 20, paddingTop: 24 },
  date: { fontSize: 15, fontWeight: "700", marginBottom: 16, textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  pointsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pointsText: { fontSize: 14.5, fontWeight: "700" },
});
