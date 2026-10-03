import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import { useTheme } from "@/theme/useTheme";
import { accents } from "@/theme/colors";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useSettingsStore } from "@/stores/settingsStore";
import { toast } from "@/stores/toastStore";
import { BIKE_PARTS, maintenanceOverview } from "@/domain/maintenance";

const km = (v: number) => Math.round(v).toLocaleString("es-CO");

export default function MaintenanceScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const { stats, refresh } = useRiderStats(userId);
  const serviced = useSettingsStore((s) => s.maintenance);
  const update = useSettingsStore((s) => s.update);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const odometer = stats.totalDistanceMeters / 1000;
  const parts = maintenanceOverview(odometer, serviced);
  const due = parts.filter((p) => p.due).length;

  // First visit: start every counter at today's odometer instead of flagging a
  // veteran rider's whole bike as overdue on day one.
  useEffect(() => {
    if (odometer > 0 && Object.keys(serviced).length === 0) {
      update({ maintenance: Object.fromEntries(BIKE_PARTS.map((p) => [p.id, odometer])) });
    }
  }, [odometer, serviced, update]);

  const markDone = (id: string, name: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    update({ maintenance: { ...serviced, [id]: odometer } });
    toast.success(`${name}: servicio registrado`);
  };

  return (
    <LargeTitleScreen title={"Mantenimiento"} leading={<BackButton size={36} />} tabBar={false}>
          <GlassCard style={styles.summary}>
            <View style={[styles.summaryIcon, { backgroundColor: due ? accents.green.base : accents.green.soft }]}>
              <Ionicons name={due ? "construct" : "checkmark-done"} size={22} color={accents.green.lip} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryTitle, { color: colors.ink }]}>
                {due ? `${due} ${due === 1 ? "pieza necesita" : "piezas necesitan"} atención` : "Tu bici está al día"}
              </Text>
              <Text style={{ color: colors.inkSoft, fontSize: 13 }}>Odómetro: {km(odometer)} km recorridos</Text>
            </View>
          </GlassCard>

          <Text style={[styles.section, { color: colors.inkSoft }]}>PIEZAS</Text>
          <GlassCard style={{ paddingVertical: 4 }} entranceDelay={60}>
            {parts.map((s, i) => (
              <Animated.View
                key={s.part.id}
                layout={LinearTransition.duration(220)}
                entering={FadeIn.duration(240).delay(i * 40)}
                style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider }]}
              >
                <View style={[styles.badge, { backgroundColor: accents.green.soft }]}>
                  <Ionicons name={s.part.icon as any} size={16} color={accents.green.lip} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.name, { color: colors.ink }]} numberOfLines={1}>{s.part.name}</Text>
                    <Text style={{ color: s.due ? colors.ink : colors.inkSoft, fontSize: 12.5, fontWeight: s.due ? "700" : "500", flexShrink: 0 }}>
                      {s.due ? "Toca revisión" : `Faltan ${km(s.remainingKm)} km`}
                    </Text>
                  </View>
                  <DuoProgressBar value={s.ratio} height={6} />
                  <Text style={{ color: colors.inkFaint, fontSize: 12 }}>
                    {s.part.hint} · {km(s.sinceKm)}/{km(s.part.intervalKm)} km
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Marcar ${s.part.name} como revisada`}
                  onPress={() => markDone(s.part.id, s.part.name)}
                  style={({ pressed }) => [styles.done, { backgroundColor: s.due ? colors.primary : "rgba(40,110,55,0.08)", opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={{ color: colors.primaryDark, fontWeight: "600", fontSize: 13 }}>Hecho</Text>
                </Pressable>
              </Animated.View>
            ))}
          </GlassCard>
          <Text style={[styles.foot, { color: colors.inkFaint }]}>
            Los kilómetros se cuentan con tus recorridos registrados en EcoBike. Empezamos a contar la primera vez que abriste esta sección. Marca “Hecho” cuando hagas el servicio y el contador vuelve a cero.
          </Text>
    </LargeTitleScreen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: "row", alignItems: "center", gap: 14 },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  section: { fontSize: 12, fontWeight: "600", letterSpacing: 0.4, marginTop: 22, marginBottom: 8, marginLeft: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  badge: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  name: { fontSize: 15.5, fontWeight: "600", flexShrink: 1 },
  done: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  foot: { fontSize: 12, lineHeight: 17, marginTop: 10, marginHorizontal: 6 },
});
