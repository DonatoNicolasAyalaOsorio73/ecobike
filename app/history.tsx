import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import SegmentedControl from "@/components/ui/SegmentedControl";
import SwipeableRow from "@/components/ui/SwipeableRow";
import { useTheme } from "@/theme/useTheme";
import { accents, type AccentName } from "@/theme/colors";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { useSettingsStore } from "@/stores/settingsStore";
import { formatDistance, formatDuration } from "@/utils/format";
import { groupRidesByMonth, ridesInPeriod, type StatsPeriod } from "@/utils/rideStats";
import { deleteRideEverywhere } from "@/services/rides.service";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import type { Ride } from "@/types/ride";

const PERIOD_OPTIONS: { label: string; value: StatsPeriod }[] = [
  { label: "Semana", value: "week" },
  { label: "Mes", value: "month" },
  { label: "Año", value: "year" },
  { label: "Todo", value: "all" },
];

/** Short / medium / long rides get their own color, like the stats donut. */
function rideAccent(meters: number): AccentName {
  return meters < 5000 ? "teal" : meters <= 15000 ? "green" : "orange";
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const units = useSettingsStore((s) => s.units);
  const { isRealAccount } = useAvailablePoints(userId);
  const { rides, refresh } = useRiderStats(userId);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<StatsPeriod>("all");
  const [query, setQuery] = useState("");

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const sections = useMemo(() => {
    const inPeriod = ridesInPeriod(rides, period);
    const q = query.trim().toLowerCase();
    const matched = q
      ? inPeriod.filter((r) => {
          // Search what the row shows: the human date and the distance.
          const label = format(new Date(r.startedAt), "d 'de' MMMM yyyy, HH:mm", { locale: es }).toLowerCase();
          return label.includes(q) || (r.distanceMeters / 1000).toFixed(1).includes(q);
        })
      : inPeriod;
    return groupRidesByMonth(matched).map((g) => ({
      key: g.key,
      title: g.label,
      km: g.rides.reduce((s, r) => s + r.distanceMeters, 0),
      data: g.rides,
    }));
  }, [rides, period, query]);

  const onDelete = async (ride: Ride) => {
    try {
      await deleteRideEverywhere(ride, isRealAccount);
      refresh();
      if (isRealAccount) refreshProfile().catch(() => {});
      toast.success(isRealAccount && ride.pointsEarned ? `Recorrido eliminado (−${ride.pointsEarned} pts)` : "Recorrido eliminado");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar. Revisa tu conexión.");
    }
  };

  const renderItem = ({ item, index }: { item: Ride; index: number }) => {
    const a = accents[rideAccent(item.distanceMeters)];
    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35).springify().damping(16)}>
        <SwipeableRow onDelete={() => onDelete(item)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Recorrido del ${format(new Date(item.startedAt), "d 'de' MMMM", { locale: es })}, ${formatDistance(item.distanceMeters, units)}`}
            onPress={() => router.push(`/ride/${item.id}`)}
            style={({ pressed }) => [styles.row, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: a.soft, borderColor: a.base }]}>
              <Ionicons name="bicycle" size={19} color={a.lip} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.date, { color: colors.ink }]}>{format(new Date(item.startedAt), "EEEE d, HH:mm", { locale: es })}</Text>
              <Text style={[styles.meta, { color: colors.inkSoft }]}>
                {formatDistance(item.distanceMeters, units)} · {formatDuration(item.durationSeconds)}
              </Text>
            </View>
            <View style={[styles.ptsPill, { backgroundColor: accents.gold.soft }]}>
              <Text style={{ color: accents.gold.lip, fontWeight: "900", fontSize: 12.5 }}>+{item.pointsEarned}</Text>
            </View>
          </Pressable>
        </SwipeableRow>
      </Animated.View>
    );
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <BackButton />
          <Text style={[styles.header, { color: colors.ink }]} accessibilityRole="header">
            Actividad
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          stickySectionHeadersEnabled={false}
          initialNumToRender={14}
          windowSize={9}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            <>
              <SegmentedControl options={PERIOD_OPTIONS} value={period} onChange={setPeriod} style={{ marginBottom: 12 }} />
              <GlassInput icon="search-outline" placeholder="Buscar por fecha o distancia" value={query} onChangeText={setQuery} autoCapitalize="none" />
              <Text style={{ color: colors.inkFaint, fontSize: 12, marginBottom: 4, marginLeft: 6 }}>Desliza un recorrido a la izquierda para eliminarlo.</Text>
            </>
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHead}>
              <Text style={[styles.monthLabel, { color: colors.ink }]}>{section.title.charAt(0).toUpperCase() + section.title.slice(1)}</Text>
              <Text style={{ color: colors.inkSoft, fontSize: 12.5, fontWeight: "700" }}>
                {section.data.length} · {formatDistance(section.km, units)}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <GlassCard>
              <Text style={{ color: colors.inkSoft, textAlign: "center" }}>
                {rides.length === 0 ? "Todavía no tienes recorridos. Ve a la pestaña Mapa para empezar el primero." : "Ningún recorrido coincide con esta búsqueda."}
              </Text>
            </GlassCard>
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
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
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, marginBottom: 8 },
  monthLabel: { fontSize: 17, fontWeight: "900" },
  // Lightweight row (no blur) so long histories scroll smoothly on any phone.
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 2, borderColor: "#EDF1EA", borderBottomWidth: 4, padding: 12, marginBottom: 10 },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  date: { fontSize: 15, fontWeight: "800", textTransform: "capitalize" },
  meta: { fontSize: 12.5, marginTop: 2 },
  ptsPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
