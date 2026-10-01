import AppModal from "@/components/ui/AppModal";
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import GlassSurface from "@/components/ui/GlassSurface";
import GlassButton from "@/components/ui/GlassButton";
import Confetti from "@/components/ui/Confetti";
import { useTheme } from "@/theme/useTheme";
import type { Redemption, Reward } from "@/types/reward";

type Phase = "details" | "confirm" | "working" | "done" | "error";

interface Props {
  reward: Reward | null;
  availablePoints: number;
  onClose: () => void;
  redeem: (reward: Reward) => Promise<Redemption>;
}

/** Reward details → explicit confirmation → result with the QR, in one bottom sheet. */
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

  const confirm = async () => {
    setPhase("working");
    try {
      const r = await redeem(reward);
      setResult(r);
      setPhase("done");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setError(e?.message ?? "No se pudo canjear. Inténtalo de nuevo.");
      setPhase("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  return (
    <AppModal visible onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={phase === "working" ? undefined : onClose} accessibilityLabel="Cerrar" />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.sheetWrap} pointerEvents="box-none">
        <GlassSurface radius={30} intensity={80} backgroundColor={colors.glassFillStrong} style={styles.sheet}>
          <View style={[styles.grabber, { backgroundColor: colors.divider }]} />
          <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
            {phase === "done" && result ? (
              <Animated.View entering={ZoomIn.springify()} style={{ alignItems: "center" }}>
                <Ionicons name="checkmark-circle" size={44} color={colors.success} />
                <Text style={[styles.title, { color: colors.ink, textAlign: "center" }]}>¡Canje listo!</Text>
                <Text style={{ color: colors.inkSoft, textAlign: "center", marginTop: 4 }}>
                  Muestra este código en {result.rewardTitle}. Solo se puede usar una vez.
                </Text>
                <View style={styles.qr}>
                  <QRCode value={result.code} size={180} />
                </View>
                <Text selectable style={[styles.code, { color: colors.ink }]}>
                  {result.code}
                </Text>
                <GlassButton
                  label="Ver mis códigos"
                  icon="qr-code-outline"
                  variant="secondary"
                  onPress={() => {
                    onClose();
                    router.push("/points/my-codes");
                  }}
                  style={{ alignSelf: "stretch", marginTop: 14 }}
                />
                <GlassButton label="Listo" icon="checkmark" onPress={onClose} style={{ alignSelf: "stretch", marginTop: 10 }} />
              </Animated.View>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.ink }]}>{reward.title}</Text>
                <Text style={{ color: colors.inkSoft, fontSize: 14.5, marginTop: 4 }}>{reward.subtitle}</Text>
                {reward.details && reward.details !== reward.subtitle ? (
                  <Text style={{ color: colors.inkSoft, fontSize: 13.5, marginTop: 10, lineHeight: 20 }}>{reward.details}</Text>
                ) : null}

                <View style={[styles.summary, { borderColor: colors.divider }]}>
                  <Row label="Costo" value={`${reward.pointsCost.toLocaleString("es-CO")} pts`} />
                  <Row label="Tus puntos" value={`${availablePoints.toLocaleString("es-CO")} pts`} />
                  <Row
                    label={affordable ? "Te quedarán" : "Te faltan"}
                    value={`${Math.abs(availablePoints - reward.pointsCost).toLocaleString("es-CO")} pts`}
                    strong
                  />
                </View>

                {phase === "error" && error && (
                  <Text style={{ color: colors.danger, marginTop: 12, textAlign: "center" }} accessibilityLiveRegion="assertive">
                    {error}
                  </Text>
                )}

                {phase === "confirm" || phase === "working" ? (
                  <>
                    <Text style={{ color: colors.ink, fontWeight: "700", textAlign: "center", marginTop: 16 }}>
                      ¿Canjear {reward.title} por {reward.pointsCost.toLocaleString("es-CO")} puntos?
                    </Text>
                    <GlassButton label="Sí, canjear" icon="gift" onPress={confirm} loading={phase === "working"} style={{ marginTop: 12 }} />
                    <GlassButton label="Cancelar" variant="secondary" onPress={() => setPhase("details")} disabled={phase === "working"} style={{ marginTop: 10 }} />
                  </>
                ) : (
                  <GlassButton
                    label={affordable ? "Canjear" : "Puntos insuficientes"}
                    icon="gift-outline"
                    disabled={!affordable}
                    onPress={() => setPhase("confirm")}
                    style={{ marginTop: 16 }}
                  />
                )}
              </>
            )}
          </ScrollView>
        </GlassSurface>
      </Animated.View>
      {phase === "done" && <Confetti />}
    </AppModal>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.inkSoft, fontSize: 13.5 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontSize: 14, fontWeight: strong ? "800" : "600" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetWrap: { position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "90%", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 480, padding: 22, paddingBottom: 34, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 14 },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4, marginTop: 6 },
  summary: { borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 16, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  qr: { padding: 14, backgroundColor: "#fff", borderRadius: 18, marginTop: 16 },
  code: { fontSize: 20, fontWeight: "800", letterSpacing: 2, marginTop: 12 },
});
