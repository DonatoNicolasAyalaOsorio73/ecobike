import React, { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassSurface from "@/components/ui/GlassSurface";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { useRewards } from "@/hooks/useRewards";
import { useAuthStore } from "@/stores/authStore";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import type { Reward } from "@/types/reward";

const CARD_SPACING = 16;

export default function PointsScreen() {
  const { colors } = useTheme();
  const userId = useCurrentUserId();
  const { points: availablePoints, isRealAccount } = useAvailablePoints(userId);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const { rewards, usingRealCatalog, catalogError, loading, redeem, refresh: refreshRewards } = useRewards(userId, isRealAccount);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  // Measured from this screen's own container, not the browser window — on
  // desktop web the app renders inside a centered ~480px frame (WebAppShell)
  // that's narrower than window width, so Dimensions.get('window') would
  // size/center the carousel for the wrong box.
  const [containerWidth, setContainerWidth] = useState(360);
  const cardWidth = Math.min(300, containerWidth - 80);

  const onContainerLayout = (e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width);

  useFocusEffect(
    useCallback(() => {
      refreshRewards();
    }, [refreshRewards])
  );

  const onRedeem = async (reward: Reward) => {
    try {
      const redemption = await redeem(reward, availablePoints);
      if (isRealAccount) await refreshProfile();
      setFeedback({ text: `¡Canjeado! Tu código: ${redemption.code}`, isError: false });
    } catch (e: any) {
      setFeedback({ text: e.message ?? "No se pudo canjear. Inténtalo de nuevo.", isError: true });
    }
  };

  const onScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + CARD_SPACING));
    setActiveIndex(index);
  };

  return (
    <View style={styles.screen} onLayout={onContainerLayout}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <GlassSurface radius={999} intensity={45} style={styles.pointsPill}>
            <Ionicons name="ribbon-outline" size={16} color={colors.primaryDark} />
            <Text style={[styles.pointsPillText, { color: colors.ink }]}>{availablePoints} puntos disponibles</Text>
          </GlassSurface>
          <Text
            style={[styles.myCodesLink, { color: colors.primaryDark }]}
            onPress={() => router.push("/points/my-codes")}
          >
            Mis códigos
          </Text>
        </View>

        <EmailVerifyBanner />
        {!isRealAccount && (
          <Text style={[styles.demoNotice, { color: colors.warning }]}>
            Catálogo de ejemplo. Inicia sesión para canjear en tiendas aliadas reales.
          </Text>
        )}
        {catalogError && (
          <GlassCard style={styles.feedbackCard}>
            <Text style={{ color: colors.inkSoft, textAlign: "center", marginBottom: 10 }}>
              No se pudo cargar el catálogo. Revisa tu conexión.
            </Text>
            <GlassButton label="Reintentar" icon="refresh" variant="secondary" onPress={refreshRewards} />
          </GlassCard>
        )}
        {usingRealCatalog && !loading && rewards.length === 0 && (
          <GlassCard style={styles.feedbackCard}>
            <Text style={{ color: colors.inkSoft, textAlign: "center" }}>Pronto habrá recompensas de tiendas aliadas.</Text>
          </GlassCard>
        )}

        {feedback && (
          <GlassCard style={styles.feedbackCard}>
            <Text style={{ color: feedback.isError ? colors.danger : colors.ink, fontWeight: "700", fontSize: 13, textAlign: "center" }}>
              {feedback.text}
            </Text>
          </GlassCard>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardWidth + CARD_SPACING}
          decelerationRate="fast"
          contentContainerStyle={[styles.carousel, { paddingHorizontal: (containerWidth - cardWidth) / 2 }]}
          onMomentumScrollEnd={onScroll}
        >
          {rewards.map((reward, i) => {
            const canAfford = availablePoints >= reward.pointsCost;
            const expanded = expandedId === reward.id;
            return (
              <GlassCard key={reward.id} style={{ width: cardWidth, marginRight: CARD_SPACING }} intensity={45} entranceDelay={i * 70}>
                <View style={[styles.rewardIcon, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                  {reward.imageUrl ? (
                    <Image source={{ uri: reward.imageUrl }} style={styles.rewardLogo} accessibilityLabel={`Logo de ${reward.title}`} />
                  ) : (
                    <Ionicons name={reward.icon as any} size={30} color={colors.primaryDark} />
                  )}
                </View>
                <Text style={[styles.rewardTitle, { color: colors.ink }]}>{reward.title}</Text>
                <Text style={[styles.rewardSubtitle, { color: colors.inkSoft }]}>{reward.subtitle}</Text>

                {expanded && (
                  <Text style={[styles.rewardDetails, { color: colors.inkSoft }]}>{reward.details}</Text>
                )}

                <View style={[styles.costPill, { backgroundColor: colors.glassFillStrong, borderColor: colors.glassBorder }]}>
                  <Ionicons name="ribbon-outline" size={13} color={colors.primaryDark} />
                  <Text style={{ color: colors.ink, fontSize: 12.5, fontWeight: "700", marginLeft: 4 }}>
                    {reward.pointsCost} pts requeridos
                  </Text>
                </View>

                <GlassButton
                  label={expanded ? "Ocultar detalles" : "Ver detalles"}
                  icon="information-circle-outline"
                  variant="secondary"
                  onPress={() => setExpandedId(expanded ? null : reward.id)}
                  style={{ marginTop: 10 }}
                />
                <GlassButton
                  label={`Canjear · ${reward.pointsCost} pts`}
                  icon="gift-outline"
                  variant="primary"
                  disabled={!canAfford}
                  onPress={() => onRedeem(reward)}
                  style={{ marginTop: 8 }}
                />
              </GlassCard>
            );
          })}
        </ScrollView>

        <View style={styles.dots}>
          {rewards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === activeIndex ? colors.primaryDark : colors.divider },
              ]}
            />
          ))}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingTop: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  pointsPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
  pointsPillText: { fontWeight: "700", fontSize: 12.5 },
  myCodesLink: { fontSize: 12.5, fontWeight: "700" },
  feedbackCard: { marginHorizontal: 20, marginBottom: 12, paddingVertical: 10 },
  demoNotice: { fontSize: 11.5, textAlign: "center", fontWeight: "600", marginBottom: 10, paddingHorizontal: 20 },
  carousel: { alignItems: "center" },
  rewardLogo: { width: 58, height: 58, borderRadius: 29 },
  rewardIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", borderWidth: 1, alignSelf: "center", marginBottom: 12 },
  rewardTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  rewardSubtitle: { fontSize: 13, textAlign: "center", marginTop: 4 },
  rewardDetails: { fontSize: 12, textAlign: "center", marginTop: 10, lineHeight: 17 },
  costPill: { flexDirection: "row", alignItems: "center", alignSelf: "center", borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
