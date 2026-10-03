import AppModal from "@/components/ui/AppModal";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, SlideInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import GlassSurface from "@/components/ui/GlassSurface";
import GlassButton from "@/components/ui/GlassButton";
import Confetti from "@/components/ui/Confetti";
import HoldToConfirm from "./HoldToConfirm";
import StoreLogo from "./StoreLogo";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import type { Redemption, Reward } from "@/types/reward";

type Phase = "details" | "working" | "done" | "error";

interface Props {
  reward: Reward | null;
  availablePoints: number;
  onClose: () => void;
  redeem: (reward: Reward) => Promise<Redemption>;
}

/**
 * Minimal redeem: the store's logo as a stamp, the price, one meter of
 * your points against it, and a single press-and-hold to redeem. Done shows
 * the QR and code to present at the store.
 */
export default function RedeemSheet({ reward, availablePoints, onClose, redeem }: Props) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>("details");
  const [result, setResult] = useState<Redemption | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (reward) {
      setPhase("details");
      setResult(null);
      setError(null);
    }
  }, [reward]);

  if (!reward) return null;
  const affordable = availablePoints >= reward.pointsCost;
  const missing = reward.pointsCost - availablePoints;

  const confirm = async () => {
    setPhase("working");
    try {
      setResult(await redeem(reward));
      setPhase("done");
    } catch (e: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(e?.message ?? "No se pudo canjear. Inténtalo de nuevo.");
      setPhase("error");
    }
  };

  return (
    <AppModal visible onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={phase === "working" ? undefined : onClose} accessibilityLabel="Cerrar" />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.sheetWrap} pointerEvents="box-none">
        <GlassSurface radius={32} intensity={90} backgroundColor="rgba(255,255,255,0.92)" style={styles.sheet}>
          <View style={[styles.grabber, { backgroundColor: colors.divider }]} />
          <ScrollView contentContainerStyle={{ paddingBottom: 6, alignItems: "center" }} showsVerticalScrollIndicator={false}>
            {phase === "done" && result ? (
              <>
                <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.check, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={34} color={colors.onPrimary} />
                </Animated.View>
                <Animated.Text entering={enter(80)} style={[type.title2, styles.center, { color: colors.ink, marginTop: 12 }]}>
                  ¡Canje listo!
                </Animated.Text>
                <Animated.Text entering={enter(120)} style={[type.subhead, styles.center, { color: colors.inkSoft, marginTop: 2 }]}>
                  Muéstralo en {result.rewardTitle}
                </Animated.Text>
                <Animated.View entering={enter(180)} style={styles.qr}>
                  <QRCode value={result.code} size={176} />
                </Animated.View>
                <Animated.Text entering={enter(220)} selectable style={[styles.code, { color: colors.ink }]}>
                  {result.code}
                </Animated.Text>
                <Animated.View entering={enter(260)} style={{ alignSelf: "stretch" }}>
                  <GlassButton label="Listo" onPress={onClose} style={{ marginTop: 16 }} />
                  <Text
                    onPress={() => {
                      onClose();
                      router.push("/points/my-codes");
                    }}
                    accessibilityRole="link"
                    style={[type.footnote, styles.center, { color: colors.inkSoft, marginTop: 12, fontWeight: "600" }]}
                  >
                    Ver mis códigos
                  </Text>
                </Animated.View>
              </>
            ) : (
              <>
                {/* Logo as a stamp: whole, no box. */}
                <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.stamp}>
                  <StoreLogo uri={reward.imageUrl} name={reward.title} size={120} />
                </Animated.View>
                <Animated.Text entering={enter(60)} style={[type.title2, styles.center, { color: colors.ink }]} numberOfLines={2}>
                  {reward.title}
                </Animated.Text>
                {reward.subtitle ? (
                  <Animated.Text entering={enter(90)} style={[type.subhead, styles.center, { color: colors.inkSoft, marginTop: 2 }]} numberOfLines={2}>
                    {reward.subtitle}
                  </Animated.Text>
                ) : null}

                {reward.details && reward.details !== reward.subtitle ? (
                  // Conditions of the reward ("no acumulable..."): short, but never hidden.
                  <Animated.Text entering={enter(110)} style={[type.footnote, styles.center, { color: colors.inkFaint, marginTop: 6 }]} numberOfLines={3}>
                    {reward.details}
                  </Animated.Text>
                ) : null}
                <Animated.View entering={enter(130)} style={styles.priceRow}>
                  <Ionicons name="ribbon" size={20} color={colors.ink} />
                  <Text style={[styles.price, { color: colors.ink }]}>{reward.pointsCost.toLocaleString("es-CO")}</Text>
                  <Text style={[type.subhead, { color: colors.inkSoft, fontWeight: "600" }]}>pts</Text>
                </Animated.View>

                {/* Your points against the price, at a glance. */}
                <Animated.View entering={enter(160)} style={styles.meterWrap}>
                  <View style={[styles.track, { backgroundColor: colors.divider }]} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: reward.pointsCost, now: Math.min(availablePoints, reward.pointsCost) }}>
                    <View style={[styles.fill, { width: `${Math.min(1, availablePoints / reward.pointsCost) * 100}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={[type.caption, styles.center, { color: colors.inkSoft, marginTop: 6, fontWeight: "500" }]}>
                    {affordable ? `Tienes ${availablePoints.toLocaleString("es-CO")} pts` : `Te faltan ${missing.toLocaleString("es-CO")} pts`}
                  </Text>
                </Animated.View>

                {phase === "error" && error && (
                  <Animated.Text entering={FadeInDown.duration(200)} style={[type.footnote, styles.center, { color: colors.danger, marginTop: 10 }]} accessibilityLiveRegion="assertive">
                    {error}
                  </Animated.Text>
                )}

                <Animated.View entering={enter(200)} style={{ alignSelf: "stretch", marginTop: 18 }}>
                  <HoldToConfirm label={affordable ? "Mantén para canjear" : "Puntos insuficientes"} onConfirm={confirm} loading={phase === "working"} disabled={!affordable} />
                </Animated.View>
              </>
            )}
          </ScrollView>
        </GlassSurface>
      </Animated.View>
      {phase === "done" && <Confetti />}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "92%", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 480, padding: 22, paddingBottom: 34, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 10 },
  center: { textAlign: "center" },
  stamp: { width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 16 },
  price: { fontSize: 40, fontWeight: "800", letterSpacing: -1.2 },
  meterWrap: { alignSelf: "stretch", marginTop: 10, paddingHorizontal: 30 },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  check: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginTop: 6 },
  qr: { padding: 14, backgroundColor: "#fff", borderRadius: 20, marginTop: 16 },
  code: { fontSize: 22, fontWeight: "800", letterSpacing: 3, marginTop: 12 },
});
