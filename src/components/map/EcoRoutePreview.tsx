import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import type { BikeRoute, Place, RoutePrefs } from "@/services/routing";

interface Props {
  eco: { place: Place; prefs: RoutePrefs; routes: BikeRoute[]; idx: number; loading: boolean; error: string | null };
  onSelect: (idx: number) => void;
  onCancel: () => void;
  onStart: () => void;
}

/**
 * Eco ruta, step 2: the route is drawn on the (unfrosted) map and this card
 * summarises it: distance, time, CO₂ avoided vs. a car, the first
 * direction, and alternatives to switch between before starting.
 */
export default function EcoRoutePreview({ eco, onSelect, onCancel, onStart }: Props) {
  const { colors } = useTheme();
  const r = eco.routes[eco.idx];
  const tags = [eco.prefs.avoidUnpaved ? "Sin destapadas" : "Admite destapadas", eco.prefs.greener ? "Menos tráfico" : "Más directa"];

  return (
    <Animated.View entering={enter()}>
      <GlassCard intensity={60}>
        <View style={styles.head}>
          <Ionicons name="leaf" size={18} color={colors.ink} />
          <Text style={[type.headline, { color: colors.ink, flex: 1 }]} numberOfLines={1}>
            {eco.place.name}
          </Text>
          <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancelar eco ruta">
            <Ionicons name="close" size={22} color={colors.inkSoft} />
          </Pressable>
        </View>

        {eco.loading && (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.inkSoft} />
            <Text style={[type.subhead, { color: colors.inkSoft }]}>Buscando la ruta más verde…</Text>
          </View>
        )}

        {eco.error && <Text style={[type.subhead, styles.error, { color: colors.danger }]}>{eco.error}</Text>}
        {!eco.loading && !eco.error && !r && <Text style={[type.subhead, styles.error, { color: colors.inkSoft }]}>No encontramos una ruta en bici hasta ese lugar.</Text>}

        {r && (
          <>
            <View style={styles.stats}>
              <Stat value={`${r.km.toFixed(1)} km`} label="Distancia" />
              <Stat value={`${r.minutes} min`} label="En bici" />
              <Stat value={`${r.co2Kg.toFixed(1)} kg`} label="CO₂ evitado" />
            </View>
            <View style={styles.tags}>
              {tags.map((t) => (
                <View key={t} style={[styles.tag, { backgroundColor: colors.chipFill }]}>
                  <Text style={[type.caption, { color: colors.ink, fontWeight: "600" }]}>{t}</Text>
                </View>
              ))}
            </View>
            {r.firstInstruction ? (
              <Text style={[type.footnote, { color: colors.inkSoft, marginTop: 8 }]} numberOfLines={2}>
                Primero: {r.firstInstruction}
              </Text>
            ) : null}

            {eco.routes.length > 1 && (
              <View style={styles.alts} accessibilityRole="radiogroup">
                {eco.routes.map((alt, i) => {
                  const on = i === eco.idx;
                  return (
                    <Pressable
                      key={i}
                      onPress={() => onSelect(i)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={[styles.alt, { backgroundColor: on ? colors.primary : colors.chipFill }]}
                    >
                      <Text style={[type.caption, { color: colors.ink, fontWeight: on ? "700" : "500" }]}>
                        {i === 0 ? "Recomendada" : `Opción ${i + 1}`} · {alt.km.toFixed(1)} km
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <GlassButton label="Iniciar eco ruta" icon="play" onPress={onStart} style={{ marginTop: 14 }} />
          </>
        )}
      </GlassCard>
    </Animated.View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[type.title3, { color: colors.ink }]}>{value}</Text>
      <Text style={[type.caption, { color: colors.inkSoft, fontWeight: "500" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  loading: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  error: { marginTop: 12 },
  stats: { flexDirection: "row", gap: 8, marginTop: 14 },
  tags: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  alts: { flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "wrap" },
  alt: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
});
