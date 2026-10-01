import React, { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
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
import { formatDistance, formatDuration, sentenceCase } from "@/utils/format";
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

  // iOS grouped inset list: each month is one rounded block; only its first
  // and last rows carry the corners, rows are split by inset hairlines.
  const renderItem = ({ item, index, section }: { item: Ride; index: number; section: { data: readonly Ride[] } }) => {
    const a = accents[rideAccent(item.distanceMeters)];
    const first = index === 0;
    const last = index === section.data.length - 1;
    return (
      <Animated.View
        entering={FadeIn.duration(260).delay(Math.min(index, 8) * 30)}
        style={[styles.cell, first && styles.cellFirst, last && styles.cellLast]}
      >
        <SwipeableRow onDelete={() => onDelete(item)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Recorrido del ${format(new Date(item.startedAt), "d 'de' MMMM", { locale: es })}, ${formatDistance(item.distanceMeters, units)}`}
            onPress={() => router.push(`/ride/${item.id}`)}
            style={({ pressed, hovered }: any) => [styles.row, { backgroundColor: pressed ? "#EEF3EC" : hovered ? "#F6F9F5" : "#FFFFFF" }]}
          >
            <View style={[styles.iconWrap, { backgroundColor: a.base }]}>
              <Ionicons name="bicycle" size={17} color={a.lip} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.date, { color: colors.ink }]}>{sentenceCase(format(new Date(item.startedAt), "EEEE d, HH:mm", { locale: es }))}</Text>
              <Text style={[styles.meta, { color: colors.inkSoft }]}>
                {formatDistance(item.distanceMeters, units)} · {formatDuration(item.durationSeconds)}
              </Text>
            </View>
            <View style={[styles.ptsPill, { backgroundColor: accents.gold.soft }]}>
              <Text style={{ color: accents.gold.lip, fontWeight: "700", fontSize: 12.5 }}>+{item.pointsEarned}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
          </Pressable>
        </SwipeableRow>
        {!last && <View style={styles.separator} />}
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
  header: { fontSize: 17, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginTop: 14, marginBottom: 8 },
  monthLabel: { fontSize: 17, fontWeight: "700" },
  // Lightweight cells (no blur) so long histories scroll smoothly on any phone.
  cell: { backgroundColor: "#FFFFFF", overflow: "hidden" },
  cellFirst: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  cellLast: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  separator: { position: "absolute", bottom: 0, left: 62, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: "rgba(20,40,25,0.14)" },
  iconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  date: { fontSize: 15, fontWeight: "700", },
  meta: { fontSize: 12.5, marginTop: 2 },
  ptsPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
