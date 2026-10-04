import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import AppModal from "@/components/ui/AppModal";
import GlassSurface from "@/components/ui/GlassSurface";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { enter } from "@/theme/motion";
import { DAILY_POINTS_CAP, POINTS_PER_KM } from "@/domain/rideScore";

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: "bicycle", title: "Pedalea", text: `${POINTS_PER_KM} pts por km en bici verificada.` },
  { icon: "trending-up", title: "Acumula", text: `Hasta ${DAILY_POINTS_CAP} pts al día.` },
  { icon: "finger-print", title: "Canjea", text: "Mantén presionado. 1 canje al día." },
  { icon: "qr-code", title: "Muéstralo", text: "Tu código QR, válido una vez." },
];

/** "¿Cómo funciona?" for Premios: four steps, one line each. */
export default function RewardsInfoSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <AppModal visible onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.wrap} pointerEvents="box-none">
        <GlassSurface radius={32} intensity={90} backgroundColor="rgba(255,255,255,0.94)" style={styles.sheet}>
          <View style={[styles.grabber, { backgroundColor: colors.divider }]} />
          <Text style={[type.title2, { color: colors.ink, marginBottom: 18 }]} accessibilityRole="header">
            Cómo funciona
          </Text>
          {STEPS.map((s, i) => (
            <Animated.View key={s.title} entering={enter(60 + i * 60)} style={styles.step}>
              <View style={[styles.icon, { backgroundColor: i === 0 ? colors.primary : colors.chipFill }]}>
                <Ionicons name={s.icon} size={20} color={colors.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.headline, { color: colors.ink }]}>{s.title}</Text>
                <Text style={[type.subhead, { color: colors.inkSoft }]}>{s.text}</Text>
              </View>
            </Animated.View>
          ))}
          <Text style={[type.footnote, { color: colors.inkFaint, marginTop: 6 }]}>Antes del primer canje: 3 recorridos verificados y correo confirmado.</Text>
          <GlassButton label="Entendido" onPress={onClose} style={{ marginTop: 18 }} />
        </GlassSurface>
      </Animated.View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
  sheet: { width: "100%", maxWidth: 480, padding: 22, paddingBottom: 34, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  grabber: { width: 40, height: 5, borderRadius: 3, alignSelf: "center", marginBottom: 14 },
  step: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
});
