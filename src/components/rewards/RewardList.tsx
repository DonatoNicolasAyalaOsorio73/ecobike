import React, { useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import SegmentedControl from "@/components/ui/SegmentedControl";
import PressableScale from "@/components/ui/PressableScale";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import type { Reward } from "@/types/reward";
import { visibleRewards } from "@/utils/rewardsMapping";

type Filter = "all" | "affordable";

/**
 * Every partner store at a glance instead of one card at a time:
 *  - search by store or benefit, filter to "what I can redeem now"
 *  - redeemable first, then cheapest first, so the answer is at the top
 *  - each row says it plainly: "Canjear" (lime, functional) or how many
 *    points are missing (neutral)
 */
export default function RewardList({ rewards, availablePoints, onPress }: { rewards: Reward[]; availablePoints: number; onPress: (r: Reward) => void }) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const affordableCount = rewards.filter((r) => r.pointsCost <= availablePoints).length;
  const shown = useMemo(() => visibleRewards(rewards, availablePoints, query, filter === "affordable"), [rewards, query, filter, availablePoints]);

  return (
    <View>
      <GlassInput icon="search-outline" placeholder="Buscar tienda o beneficio" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
      <SegmentedControl
        options={[
          { label: `Todas (${rewards.length})`, value: "all" },
          { label: `Puedo canjear (${affordableCount})`, value: "affordable" },
        ]}
        value={filter}
        onChange={setFilter}
        style={{ marginBottom: 14 }}
      />

      {shown.length === 0 ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text style={[type.subhead, styles.empty, { color: colors.inkSoft }]}>
            {query.trim()
              ? `Ninguna tienda coincide con "${query.trim()}".`
              : "Aún no te alcanza para ninguna. Sigue pedaleando: 10 pts por km."}
          </Text>
        </Animated.View>
      ) : (
        <GlassCard style={styles.list}>
          {shown.map((r, i) => (
            <Animated.View key={r.id} layout={LinearTransition.springify().damping(20)} entering={FadeIn.duration(200)}>
              {i > 0 && <View style={[styles.sep, { backgroundColor: colors.divider }]} />}
              <Row reward={r} availablePoints={availablePoints} onPress={() => onPress(r)} />
            </Animated.View>
          ))}
        </GlassCard>
      )}
    </View>
  );
}

function Row({ reward, availablePoints, onPress }: { reward: Reward; availablePoints: number; onPress: () => void }) {
  const { colors } = useTheme();
  const affordable = reward.pointsCost <= availablePoints;
  const missing = reward.pointsCost - availablePoints;
  return (
    <PressableScale
      depth={0.015}
      onPress={onPress}
      accessibilityLabel={`${reward.title}, ${reward.subtitle}, ${reward.pointsCost} puntos`}
      style={styles.row}
    >
      <View style={[styles.logo, { backgroundColor: colors.chipFill }]}>
        {reward.imageUrl ? (
          <Image source={{ uri: reward.imageUrl }} style={styles.logoImg} accessibilityIgnoresInvertColors />
        ) : (
          <Ionicons name={reward.icon as any} size={20} color={colors.ink} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[type.callout, { color: colors.ink, fontWeight: "600" }]} numberOfLines={1}>
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
        <Text style={[type.caption, { color: colors.inkSoft, fontWeight: "500" }]}>Faltan {missing.toLocaleString("es-CO")}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 4, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  sep: { position: "absolute", top: 0, left: 56, right: 0, height: StyleSheet.hairlineWidth },
  logo: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  logoImg: { width: "100%", height: "100%" },
  status: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  empty: { textAlign: "center", paddingVertical: 28, paddingHorizontal: 12 },
});
