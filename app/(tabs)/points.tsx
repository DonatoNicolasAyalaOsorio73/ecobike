import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassIconButton from "@/components/ui/GlassIconButton";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import RewardCarousel from "@/components/rewards/RewardCarousel";
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
  const [width, setWidth] = useState(360);
  const [selected, setSelected] = useState<Reward | null>(null);
  const { level, nextLevelAt } = levelForPoints(availablePoints);
  const { rides } = useRiderStats(userId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const affordable = rewards.filter((r) => r.pointsCost <= availablePoints).length;

  return (
    <View style={styles.screen} onLayout={onLayout}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 130 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.header, { color: colors.ink }]} accessibilityRole="header">
              Recompensas
            </Text>
            <GlassIconButton icon="qr-code-outline" accessibilityLabel="Mis códigos" onPress={() => router.push("/points/my-codes")} size={44} />
          </View>

          <View style={styles.pad}>
            <GlassCard intensity={45}>
              <Text style={{ color: colors.inkSoft, fontSize: 12.5, fontWeight: "600" }}>Tus puntos</Text>
              <AnimatedNumber
                value={availablePoints}
                style={[styles.balance, { color: colors.ink }]}
                format={(v) => v.toLocaleString("es-CO")}
              />
              <View style={styles.balanceRow}>
                <View style={[styles.levelPill, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                  <Ionicons name="trending-up" size={12} color={colors.primaryDark} />
                  <Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: "800", marginLeft: 4 }}>Nivel {level}</Text>
                </View>
                <Text style={{ color: colors.inkSoft, fontSize: 12.5, flex: 1 }}>
                  {nextLevelAt ? `${(nextLevelAt - availablePoints).toLocaleString("es-CO")} pts para el nivel ${level + 1}` : "Nivel máximo"}
                </Text>
              </View>
              {rewards.length > 0 && (
                <Text style={{ color: colors.primaryDark, fontSize: 13, fontWeight: "700", marginTop: 10 }}>
                  {affordable > 0 ? `Puedes canjear ${affordable} de ${rewards.length} recompensas` : "Sigue pedaleando para tu primer canje"}
                </Text>
              )}
            </GlassCard>
          </View>

          <EmailVerifyBanner />

          {!isRealAccount && (
            <Text style={[styles.notice, { color: colors.warning }]}>Catálogo de ejemplo. Inicia sesión para canjear en tiendas aliadas reales.</Text>
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
              <Text style={[styles.section, { color: colors.ink }]}>Destacadas</Text>
              <RewardCarousel rewards={rewards} availablePoints={availablePoints} width={width} onPress={setSelected} />
            </>
          )}

          <Text style={[styles.section, { color: colors.ink }]}>Gana más puntos hoy</Text>
          <View style={styles.pad}>
            <MissionsCard rides={rides} />
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Cómo ganar puntos</Text>
          <View style={styles.pad}>
            <GlassCard>
              <HowRow icon="speedometer-outline" title="10 puntos por km" text="Cada kilómetro que pedaleas suma." />
              <HowRow icon="checkmark-done-outline" title="+20 por recorrido" text="Por cada recorrido completado de más de 200 m." />
              <HowRow icon="shield-checkmark-outline" title="Puntos verificados" text="Se calculan en nuestro servidor y se sincronizan en todos tus dispositivos." last />
            </GlassCard>
          </View>
        </ScrollView>
      </SafeAreaView>

      <RedeemSheet reward={selected} availablePoints={availablePoints} onClose={() => setSelected(null)} redeem={(r) => redeem(r, availablePoints)} />
    </View>
  );
}

function HowRow({ icon, title, text, last }: { icon: any; title: string; text: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.howRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <View style={[styles.howIcon, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
        <Ionicons name={icon} size={17} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink, fontWeight: "700" }}>{title}</Text>
        <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 2 }}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, marginBottom: 14 },
  header: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  pad: { paddingHorizontal: 20 },
  balance: { fontSize: 44, fontWeight: "800", letterSpacing: -1.2, marginTop: 2 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 },
  levelPill: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  notice: { fontSize: 12, textAlign: "center", fontWeight: "600", marginTop: 12, paddingHorizontal: 20 },
  section: { fontSize: 18, fontWeight: "800", paddingHorizontal: 20, marginTop: 24, marginBottom: 12 },
  howRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  howIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
