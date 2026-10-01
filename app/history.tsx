import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SwipeableRow from "@/components/ui/SwipeableRow";
import { useTheme } from "@/theme/useTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDistance, formatDuration } from "@/utils/format";
import { groupRidesByMonth, ridesInPeriod, type StatsPeriod } from "@/utils/rideStats";
import { deleteRide } from "@/services/db";
import { toast } from "@/stores/toastStore";
import type { Ride } from "@/types/ride";

const PERIOD_OPTIONS: { label: string; value: StatsPeriod }[] = [
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Año", value: "year" },
  { label: "Todo", value: "all" },
];

export default function HistoryScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const units = useSettingsStore((s) => s.units);
  const { rides, refresh } = useRiderStats(userId);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [query, setQuery] = useState("");

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const groups = useMemo(() => {
    const inPeriod = ridesInPeriod(rides, period);
    const q = query.trim().toLowerCase();
    const matched = q
      ? inPeriod.filter((r) => {
          // Search over what's actually visible on the row — the human-readable
          // date and the distance — so typing "septiembre" or "12" finds what
          // the rider is looking at rather than matching an internal id.
          const label = format(new Date(r.startedAt), "d 'de' MMMM yyyy, HH:mm", { locale: es }).toLowerCase();
          const km = (r.distanceMeters / 1000).toFixed(1);
          return label.includes(q) || km.includes(q);
        })
      : inPeriod;
    return groupRidesByMonth(matched);
  }, [rides, period, query]);

  const totalShown = groups.reduce((sum, g) => sum + g.rides.length, 0);

  const onDelete = (ride: Ride) => {
    deleteRide(ride.id);
    refresh();
    toast.success("Recorrido eliminado");
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.header, { color: colors.ink }]}>Actividad</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} style={{ marginBottom: 12 }} />

          <GlassInput
            icon="search-outline"
            placeholder="Buscar por fecha o distancia"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />

          {totalShown === 0 ? (
            <GlassCard>
              <Text style={{ color: colors.inkSoft, textAlign: "center" }}>
                {rides.length === 0
                  ? "Todavía no tienes recorridos. Ve a la pestaña Mapa para empezar el primero."
                  : "Ningún recorrido coincide con esta búsqueda."}
              </Text>
            </GlassCard>
          ) : (
            groups.map((group) => (
              <View key={group.key}>
                <Text style={[styles.monthLabel, { color: colors.inkFaint }]}>
                  {group.label.toUpperCase()} · {group.rides.length}
                </Text>
                {group.rides.map((item, index) => (
                  <SwipeableRow key={item.id} onDelete={() => onDelete(item)}>
                    <Pressable onPress={() => router.push(`/ride/${item.id}`)}>
                      <GlassCard style={{ marginBottom: 12 }} entranceDelay={Math.min(index, 8) * 40}>
                        <View style={styles.row}>
                          <View style={[styles.iconWrap, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                            <Ionicons name="bicycle" size={18} color={colors.primaryDark} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.date, { color: colors.ink }]}>
                              {format(new Date(item.startedAt), "d 'de' MMMM, HH:mm", { locale: es })}
                            </Text>
                            <Text style={[styles.meta, { color: colors.inkSoft }]}>
                              {formatDistance(item.distanceMeters, units)} · {formatDuration(item.durationSeconds)} · +{item.pointsEarned} pts
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
                        </View>
                      </GlassCard>
                    </Pressable>
                  </SwipeableRow>
                ))}
              </View>
            ))
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 4, marginBottom: 8 },
  header: { fontSize: 17, fontWeight: "800" },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  monthLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  date: { fontSize: 14.5, fontWeight: "700" },
  meta: { fontSize: 12.5, marginTop: 2 },
});
