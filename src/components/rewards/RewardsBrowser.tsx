import React, { useMemo, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, LinearTransition } from "react-native-reanimated";
import GlassSurface from "@/components/ui/GlassSurface";
import PressableScale from "@/components/ui/PressableScale";
import RewardCarousel from "./RewardCarousel";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import type { Reward } from "@/types/reward";
import { visibleRewards } from "@/utils/rewardsMapping";

interface Props {
  rewards: Reward[];
  availablePoints: number;
  /** Full content width (the carousel is full-bleed). */
  width: number;
  onPress: (r: Reward) => void;
}

/**
 * One place to explore and to find. A single search bar with a
 * "Puedo canjear" chip beside it (no separate filter row):
 *  - idle: just the carousel (minimal; no long list competing with it)
 *  - searching or filtering: the carousel steps aside and only matches show
 *    as a compact list, redeemable first, with a live count
 */
export default function RewardsBrowser({ rewards, availablePoints, width, onPress }: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const affordableCount = rewards.filter((r) => r.pointsCost <= availablePoints).length;
  const searching = query.trim().length > 0 || onlyAffordable;
  const shown = useMemo(() => visibleRewards(rewards, availablePoints, query, onlyAffordable), [rewards, availablePoints, query, onlyAffordable]);

  return (
    <View>
      {/* Search bar + filter chip on one row */}
      <View style={styles.pad}>
        <View style={styles.searchRow}>
          <GlassSurface radius={999} intensity={40} specular={false} backgroundColor={colors.chipFill} borderColor={colors.chipBorder} style={styles.search}>
            <Ionicons name="search" size={17} color={colors.inkSoft} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar tienda o beneficio"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Buscar tienda o beneficio"
              style={[styles.input, { color: colors.ink }]}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery("")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Borrar búsqueda">
                <Ionicons name="close-circle" size={18} color={colors.inkFaint} />
              </Pressable>
            )}
          </GlassSurface>
          <PressableScale
            depth={0.06}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
              setOnlyAffordable((v) => !v);
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: onlyAffordable }}
            accessibilityLabel={`Solo las que puedo canjear (${affordableCount})`}
            style={[styles.chip, { backgroundColor: onlyAffordable ? colors.primary : colors.chipFill, borderColor: onlyAffordable ? colors.primary : colors.chipBorder }]}
          >
            <Ionicons name={onlyAffordable ? "checkmark-circle" : "ribbon-outline"} size={15} color={colors.ink} />
            <Text style={[type.caption, { color: colors.ink }]}>{affordableCount}</Text>
          </PressableScale>
        </View>
      </View>

      {searching ? (
        <Animated.View key="results" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.pad}>
          <Text style={[type.footnote, styles.count, { color: colors.inkSoft }]}>
            {shown.length === 0
              ? query.trim()
                ? `Ninguna tienda coincide con "${query.trim()}".`
                : "Aún no te alcanza para ninguna. Sigue pedaleando: 10 pts por km."
              : `${shown.length} ${shown.length === 1 ? "tienda" : "tiendas"}${onlyAffordable ? " que puedes canjear" : ""}`}
          </Text>
          <List rewards={shown} availablePoints={availablePoints} onPress={onPress} />
        </Animated.View>
      ) : (
        <Animated.View key="browse" entering={FadeIn.duration(260)}>
          <RewardCarousel rewards={rewards} availablePoints={availablePoints} width={width} onPress={onPress} />
        </Animated.View>
      )}
    </View>
  );
}

function List({ rewards, availablePoints, onPress }: { rewards: Reward[]; availablePoints: number; onPress: (r: Reward) => void }) {
  const { colors } = useTheme();
  return (
    <View>
      {rewards.map((r, i) => (
        <Animated.View key={r.id} layout={LinearTransition.springify().damping(20)} entering={enter(Math.min(i, 8) * 40)}>
          {i > 0 && <View style={[styles.sep, { backgroundColor: colors.divider }]} />}
          <Row reward={r} availablePoints={availablePoints} onPress={() => onPress(r)} />
        </Animated.View>
      ))}
    </View>
  );
}

/** Logo as a stamp: large, whole, no box or background behind it. */
function Row({ reward, availablePoints, onPress }: { reward: Reward; availablePoints: number; onPress: () => void }) {
  const { colors } = useTheme();
  const affordable = reward.pointsCost <= availablePoints;
  const [broken, setBroken] = useState(false);
  const logo = broken ? undefined : reward.imageUrl;
  return (
    <PressableScale depth={0.015} onPress={onPress} accessibilityLabel={`${reward.title}, ${reward.subtitle}, ${reward.pointsCost} puntos`} style={styles.row}>
      <View style={styles.stamp}>
        {logo ? (
          <Image source={{ uri: logo }} style={[styles.stampImg, STAMP_SHADOW]} resizeMode="contain" onError={() => setBroken(true)} accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name={reward.icon as any} size={28} color={colors.inkSoft} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.headline, { color: colors.ink }]} numberOfLines={1}>
          {reward.title}
        </Text>
        {reward.subtitle ? (
          <Text style={[type.footnote, { color: colors.inkSoft }]} numberOfLines={1}>
            {reward.subtitle}
          </Text>
        ) : null}
        <Text style={[type.caption, { color: colors.inkFaint, marginTop: 2 }]}>{reward.pointsCost.toLocaleString("es-CO")} pts</Text>
      </View>
      {affordable ? (
        <View style={[styles.status, { backgroundColor: colors.primary }]}>
          <Text style={[type.caption, { color: colors.onPrimary }]}>Canjear</Text>
        </View>
      ) : (
        <Text style={[type.caption, { color: colors.inkSoft, fontWeight: "500" }]}>Faltan {(reward.pointsCost - availablePoints).toLocaleString("es-CO")}</Text>
      )}
    </PressableScale>
  );
}

// Shadow that follows the logo's own shape (transparent PNG) instead of a box.
const STAMP_SHADOW = Platform.OS === "web" ? ({ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" } as object) : null;

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 28, marginBottom: 20 },
  search: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, height: 44 },
  input: { flex: 1, fontSize: 15.5, minWidth: 0, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null) },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, height: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  count: { marginBottom: 6, marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  sep: { position: "absolute", top: 0, left: 74, right: 0, height: StyleSheet.hairlineWidth },
  stamp: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  stampImg: { width: 60, height: 60 },
  status: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
