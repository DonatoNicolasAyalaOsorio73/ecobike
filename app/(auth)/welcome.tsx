import React, { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassButton from "@/components/ui/GlassButton";
import SocialRow from "@/components/ui/SocialRow";
import Logo from "@/components/ui/Logo";
import { AuthLink, Rise } from "@/components/auth/AuthScaffold";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { signInWithApple, isAppleAuthAvailable } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: "ribbon-outline", title: "Gana puntos", text: "Pedaleando, canjeables en tiendas" },
  { icon: "flame-outline", title: "Mantén tu racha", text: "Pedalea cada día y sube de nivel" },
  { icon: "people-outline", title: "Reta a tus amigos", text: "Ranking, chat y logros" },
];

/**
 * First impression: the logo is the protagonist, one calm headline, three
 * quiet reasons (neutral icons, no boxes), and the actions anchored at the
 * bottom where the thumb is. Lime appears only on the primary button.
 */
export default function WelcomeScreen() {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { available: googleAvailable, promptAsync } = useGoogleAuth(setError);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);
  const { width, height } = useWindowDimensions();
  const compact = height < 740; // iPhone SE / small Androids
  const logoSize = Math.min(compact ? 220 : 300, width * 0.78);

  useEffect(() => {
    if (Platform.OS === "ios") isAppleAuthAvailable().then(setAppleAvailable);
  }, []);

  return (
    <View style={styles.screen}>
      <BackgroundBlobs variant="auth" />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={styles.column}>
            <View style={styles.hero}>
              <Logo size={logoSize} />
              <Rise index={0}>
                <Text style={[styles.headline, { color: colors.ink }, compact && styles.headlineCompact]}>
                  Muévete mejor.{"\n"}
                  <Text style={{ color: colors.inkSoft }}>Vive sostenible.</Text>
                </Text>
              </Rise>

              <View style={[styles.features, compact && { marginTop: 22, gap: 12 }]}>
                {FEATURES.map((f, i) => (
                  <Rise key={f.title} index={1 + i} style={styles.feature}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={f.icon} size={18} color={colors.ink} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.callout, { color: colors.ink, fontWeight: "600" }]}>{f.title}</Text>
                      <Text style={[type.footnote, { color: colors.inkSoft }]}>{f.text}</Text>
                    </View>
                  </Rise>
                ))}
              </View>

              {!isFirebaseConfigured && (
                <Text style={[styles.notice, { color: colors.inkSoft }]}>Sin conexión con el servidor: puedes explorar sin cuenta.</Text>
              )}
              {error && <Text style={[styles.notice, { color: colors.danger }]}>{error}</Text>}
            </View>

            <Rise index={4} style={styles.actions}>
              <GlassButton label="Empezar gratis" onPress={() => router.push("/(auth)/register")} />
              <GlassButton label="Ya tengo cuenta" variant="secondary" onPress={() => router.push("/(auth)/login")} style={{ marginTop: 12 }} />

              <SocialRow
                onGoogle={googleAvailable ? () => promptAsync() : undefined}
                onApple={appleAvailable ? () => signInWithApple().catch((e) => setError(e.message)) : undefined}
              />

              <View style={{ marginTop: 20 }}>
                <AuthLink role="button" onPress={continueAsGuest}>Explorar sin cuenta</AuthLink>
              </View>
            </Rise>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 8 },
  column: { flex: 1, width: "100%", maxWidth: 400, alignSelf: "center", justifyContent: "space-between" },
  hero: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  headline: { marginTop: 4, fontSize: 32, fontWeight: "700", textAlign: "center", lineHeight: 38, letterSpacing: -0.8 },
  headlineCompact: { fontSize: 26, lineHeight: 31 },
  // A centered block of left-aligned rows (iOS "what's new" pattern), not edge to edge.
  features: { alignSelf: "center", width: "100%", maxWidth: 300, gap: 16, marginTop: 34 },
  feature: { flexDirection: "row", alignItems: "center", gap: 14 },
  featureIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(20,23,26,0.05)" },
  notice: { marginTop: 18, fontSize: 12.5, textAlign: "center", fontWeight: "600" },
  actions: { paddingTop: 20, paddingBottom: 18 },
});
