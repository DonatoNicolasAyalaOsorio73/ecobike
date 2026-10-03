import React, { useCallback, useState } from "react";
import { RefreshControl, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import LargeTitleScreen from "@/components/ui/LargeTitleScreen";
import ProfileButton from "@/components/ui/ProfileButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassIconButton from "@/components/ui/GlassIconButton";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import RewardsBrowser from "@/components/rewards/RewardsBrowser";
import RewardsInfoSheet from "@/components/rewards/RewardsInfoSheet";
import RedeemSheet from "@/components/rewards/RedeemSheet";
import MissionsCard from "@/components/MissionsCard";
import { useRiderStats } from "@/hooks/useRiderStats";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { useTheme } from "@/theme/useTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { useRewards } from "@/hooks/useRewards";
import { levelForPoints } from "@/utils/gamification";
import type { Reward } from "@/types/reward";

export default function PointsScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const { points: availablePoints, isRealAccount } = useAvailablePoints(userId);
  const { rewards, usingRealCatalog, catalogError, loading, redeem, refresh } = useRewards(userId, isRealAccount);
  const [selected, setSelected] = useState<Reward | null>(null);
  const [width, setWidth] = useState(360);
  const [info, setInfo] = useState(false);
  const { level, nextLevelAt } = levelForPoints(availablePoints);
  const { rides } = useRiderStats(userId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );


  return (
    <>
      <LargeTitleScreen
        title="Premios"
        padded={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
        trailing={
          <>
            <GlassIconButton liquid icon="information" accessibilityLabel="Cómo funciona" onPress={() => setInfo(true)} size={36} />
            <GlassIconButton liquid icon="qr-code-outline" accessibilityLabel="Mis códigos" onPress={() => router.push("/points/my-codes")} size={36} />
            <ProfileButton />
          </>
        }
      >
        <View onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>

          <View style={styles.pad}>
            <View style={styles.hero}>
              <Text style={{ color: colors.inkSoft, fontSize: 12.5, fontWeight: "600" }}>Tus puntos</Text>
              <AnimatedNumber
                value={availablePoints}
                style={[styles.balance, { color: colors.ink }]}
                format={(v) => v.toLocaleString("es-CO")}
              />
              <View style={styles.balanceRow}>
                <View style={[styles.levelPill, { backgroundColor: colors.chipFill, borderColor: colors.chipBorder }]}>
                  <Ionicons name="trending-up" size={12} color={colors.primaryDark} />
                  <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "700", marginLeft: 4 }}>Nivel {level}</Text>
                </View>
                <Text style={{ color: colors.inkSoft, fontSize: 12.5, flex: 1 }}>
                  {nextLevelAt ? `${(nextLevelAt - availablePoints).toLocaleString("es-CO")} pts para el nivel ${level + 1}` : "Nivel máximo"}
                </Text>
              </View>
            </View>
          </View>

          <EmailVerifyBanner />

          {!isRealAccount && (
            <Text style={[styles.notice, { color: colors.warning }]}>Catálogo de ejemplo · inicia sesión para canjear</Text>
          )}
          {catalogError && (
            <View style={styles.pad}>
              <GlassCard>
                <Text style={{ color: colors.inkSoft, textAlign: "center", marginBottom: 10 }}>No se pudo cargar el catálogo. Revisa tu conexión.</Text>
                <GlassButton label="Reintentar" icon="refresh" variant="secondary" onPress={refresh} />
              </GlassCard>
            </View>
          )}
          {usingRealCatalog && !loading && rewards.length === 0 && (
            <View style={styles.pad}>
              <GlassCard>
                <Text style={{ color: colors.inkSoft, textAlign: "center" }}>Pronto habrá recompensas de tiendas aliadas.</Text>
              </GlassCard>
            </View>
          )}

          {rewards.length > 0 && (
            <>
              {/* Explore and find in one place: one search bar, carousel when idle, results when searching. */}
              <RewardsBrowser rewards={rewards} availablePoints={availablePoints} width={width} onPress={setSelected} />
            </>
          )}

          <Text style={[styles.section, { color: colors.ink }]}>Gana más puntos hoy</Text>
          <View style={styles.pad}>
            <MissionsCard rides={rides} />
          </View>

        </View>
      </LargeTitleScreen>

      <RewardsInfoSheet visible={info} onClose={() => setInfo(false)} />
      <RedeemSheet reward={selected} availablePoints={availablePoints} onClose={() => setSelected(null)} redeem={(r) => redeem(r, availablePoints)} />
    </>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: 20 },
  // Essential level sits on the page (no card), like Inicio.
  hero: { paddingTop: 4, paddingBottom: 8 },
  balance: { fontSize: 44, fontWeight: "700", letterSpacing: -1.2, marginTop: 2 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  levelPill: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  notice: { fontSize: 12, textAlign: "center", fontWeight: "600", marginTop: 12, paddingHorizontal: 20 },
  section: { fontSize: 20, fontWeight: "700", paddingHorizontal: 20, marginTop: 32, marginBottom: 12, letterSpacing: -0.3 },
});
