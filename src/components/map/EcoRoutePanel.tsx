import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import LiquidToggle from "@/components/ui/LiquidToggle";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import { searchPlaces, type Place, type RoutePrefs } from "@/services/routing";

interface Props {
  near: { lat: number; lng: number } | null;
  prefs: RoutePrefs;
  onPrefsChange: (p: RoutePrefs) => void;
  onPick: (place: Place) => void;
  onBack: () => void;
}

/**
 * Eco ruta, step 1: where to and how. Search a place (biased to where you
 * are) and choose the kind of ride: avoid unpaved roads, prefer quiet
 * streets and bike lanes. Picking a place hands off to the map preview.
 */
export default function EcoRoutePanel({ near, prefs, onPrefsChange, onPick, onBack }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search; a newer query cancels the previous request.
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      searchPlaces(query, near, ctrl.signal)
        .then((r) => {
          setResults(r);
          setError(r.length ? null : "Sin resultados. Prueba con otro nombre o dirección.");
        })
        .catch((e) => !ctrl.signal.aborted && setError(e.message))
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, near]);

  return (
    <View style={styles.wrap}>
      <Animated.View entering={enter()} style={styles.header}>
        <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Volver a los modos">
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Text style={[type.title2, { color: colors.ink, flex: 1 }]}>Eco ruta</Text>
        <Ionicons name="leaf" size={20} color={colors.ink} />
      </Animated.View>

      <Animated.View entering={enter(40)}>
        <GlassSurface radius={16} intensity={60} backgroundColor="rgba(255,255,255,0.85)" style={styles.search}>
          <Ionicons name="search" size={18} color={colors.inkSoft} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="¿A dónde quieres ir?"
            placeholderTextColor={colors.placeholder}
            accessibilityLabel="Buscar destino"
            returnKeyType="search"
            style={[styles.input, { color: colors.ink }]}
          />
          {loading && <ActivityIndicator size="small" color={colors.inkSoft} />}
        </GlassSurface>
      </Animated.View>

      <Animated.View entering={enter(80)} style={styles.prefs}>
        <Pref icon="trail-sign-outline" label="Evitar vías destapadas" value={prefs.avoidUnpaved} onChange={(v) => onPrefsChange({ ...prefs, avoidUnpaved: v })} />
        <Pref icon="leaf-outline" label="Ruta más verde (menos tráfico)" value={prefs.greener} onChange={(v) => onPrefsChange({ ...prefs, greener: v })} />
      </Animated.View>

      {error && <Text style={[type.footnote, styles.note, { color: colors.inkSoft }]}>{error}</Text>}
      {!near && <Text style={[type.footnote, styles.note, { color: colors.inkSoft }]}>Activa tu ubicación para calcular la ruta desde donde estás.</Text>}

      <View style={{ gap: 8 }}>
        {results.map((p, i) => (
          <Animated.View key={`${p.lat},${p.lng},${i}`} entering={enter(i * 30)}>
            <PressableScale depth={0.03} onPress={() => onPick(p)} accessibilityLabel={`${p.name}, ${p.detail}`} disabled={!near}>
              <GlassSurface radius={16} intensity={50} backgroundColor="rgba(255,255,255,0.82)" style={styles.result}>
                <Ionicons name="location-outline" size={18} color={colors.ink} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.callout, { color: colors.ink, fontWeight: "600" }]} numberOfLines={1}>{p.name}</Text>
                  {p.detail ? <Text style={[type.caption, { color: colors.inkSoft, fontWeight: "400" }]} numberOfLines={1}>{p.detail}</Text> : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkFaint} />
              </GlassSurface>
            </PressableScale>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

function Pref({ icon, label, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.prefRow}>
      <Ionicons name={icon} size={18} color={colors.ink} />
      <Text style={[type.subhead, { color: colors.ink, flex: 1 }]}>{label}</Text>
      <LiquidToggle value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  search: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, height: 48 },
  input: { flex: 1, fontSize: 16, minWidth: 0, outlineStyle: "none" } as any,
  prefs: { gap: 4, paddingHorizontal: 4 },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  note: { paddingHorizontal: 6 },
  result: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12 },
});
