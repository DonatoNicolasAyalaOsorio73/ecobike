import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { Easing, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassButton from "@/components/ui/GlassButton";
import SocialRow from "@/components/ui/SocialRow";
import Logo from "@/components/ui/Logo";
import { useTheme } from "@/theme/useTheme";
import { accents, type AccentName } from "@/theme/colors";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { signInWithApple, isAppleAuthAvailable } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; accent: AccentName; title: string; text: string }[] = [
  { icon: "ribbon", accent: "gold", title: "Gana puntos", text: "10 por km, canjeables en tiendas" },
  { icon: "flame", accent: "orange", title: "Mantén tu racha", text: "Pedalea cada día y sube de nivel" },
  { icon: "people", accent: "blue", title: "Reta a tus amigos", text: "Ranking, chat y logros" },
];

/** Gentle up-and-down float, staggered per element (decorative). */
function Floating({ children, delay = 0, distance = 8, style }: { children: React.ReactNode; delay?: number; distance?: number; style?: any }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withSequence(withTiming(1, { duration: 1600 + delay, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 1600 + delay, easing: Easing.inOut(Easing.sin) })), -1);
  }, [t, delay]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: -distance * t.value }] }));
  return <Animated.View style={[style, s]}>{children}</Animated.View>;
}

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { available: googleAvailable, promptAsync } = useGoogleAuth(setError);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const compact = useWindowDimensions().height < 740; // iPhone SE / small Androids

  useEffect(() => {
    if (Platform.OS === "ios") isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.safe} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.hero}>
          <View>
            <Floating distance={6}>
              <Logo size={compact ? "small" : "large"} />
            </Floating>
          </View>

          <Animated.Text entering={FadeInDown.delay(150).springify()} style={[styles.headline, { color: colors.ink }, compact && { fontSize: 26, lineHeight: 31, marginTop: 14 }]}>
            Muévete mejor.{"\n"}
            Vive <Text style={{ color: accents.green.base }}>sostenible.</Text>
          </Animated.Text>

          <View style={[styles.features, compact && { marginTop: 16, gap: 8 }]}>
            {FEATURES.map((f, i) => (
              <Animated.View key={f.title} entering={FadeInUp.delay(300 + i * 110).springify().damping(13)} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: accents[f.accent].soft, borderColor: accents[f.accent].base }]}>
                  <Ionicons name={f.icon} size={20} color={accents[f.accent].lip} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 15 }}>{f.title}</Text>
                  <Text style={{ color: colors.inkSoft, fontSize: 13 }}>{f.text}</Text>
                </View>
              </Animated.View>
            ))}
          </View>

          {!isFirebaseConfigured && (
            <Text style={[styles.notice, { color: colors.warning }]}>Sin conexión con el servidor: puedes explorar sin cuenta.</Text>
          )}
          {error && <Text style={[styles.notice, { color: colors.danger }]}>{error}</Text>}
        </View>

        <Animated.View entering={FadeInUp.delay(650).springify()} style={styles.actions}>
          <GlassButton label="Empezar gratis" icon="rocket-outline" onPress={() => router.push("/(auth)/register")} style={{ marginBottom: 12 }} />
          <GlassButton label="Ya tengo cuenta" variant="secondary" onPress={() => router.push("/(auth)/login")} />

          <SocialRow
            onGoogle={googleAvailable ? () => promptAsync() : undefined}
            onApple={appleAvailable ? () => signInWithApple().catch((e) => setError(e.message)) : undefined}
          />

          <Text style={[styles.guestLink, { color: colors.inkSoft }]} onPress={continueAsGuest} accessibilityRole="button">
            Explorar sin cuenta
          </Text>
        </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 12 },
  hero: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  headline: { marginTop: 22, fontSize: 30, fontWeight: "700", textAlign: "center", lineHeight: 36, letterSpacing: -0.5 },
  features: { alignSelf: "stretch", gap: 12, marginTop: 26 },
  feature: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 18, borderWidth: 2, borderColor: "#EDF1EA", padding: 12 },
  featureIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  notice: { marginTop: 14, fontSize: 12.5, textAlign: "center", fontWeight: "600" },
  guestLink: { marginTop: 16, fontSize: 14, textAlign: "center", fontWeight: "700" },
  actions: { paddingBottom: 18 },
  deco: { position: "absolute" },
  decoBubble: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
