import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Platform } from "react-native";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassButton from "@/components/ui/GlassButton";
import SocialRow from "@/components/ui/SocialRow";
import Logo from "@/components/ui/Logo";
import { useTheme } from "@/theme/useTheme";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { signInWithApple, isAppleAuthAvailable } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { useState, useEffect } from "react";

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const { available: googleAvailable, promptAsync } = useGoogleAuth(setError);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  useEffect(() => {
    if (Platform.OS === "ios") {
      isAppleAuthAvailable().then(setAppleAvailable);
    }
  }, []);

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Logo size="large" />

          <Text style={[styles.headline, { color: colors.ink }]}>
            Muévete mejor.{"\n"}
            Vive <Text style={{ color: colors.primaryDark }}>sostenible.</Text>
          </Text>

          <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
            Pedalea, registra tus recorridos y desbloquea logros mientras cuidas el planeta.
          </Text>

          {!isFirebaseConfigured && (
            <Text style={[styles.demoNotice, { color: colors.warning }]}>
              Modo demo local: configura Firebase para crear cuenta e iniciar sesión.
            </Text>
          )}
          {error && <Text style={[styles.demoNotice, { color: colors.danger }]}>{error}</Text>}
        </View>

        <View style={styles.actions}>
          <GlassButton
            label="Ya tengo cuenta"
            icon="log-in-outline"
            variant="primary"
            onPress={() => router.push("/(auth)/login")}
            style={{ marginBottom: 12 }}
          />
          <GlassButton
            label="Registrarme"
            icon="person-add-outline"
            variant="secondary"
            onPress={() => router.push("/(auth)/register")}
          />

          <SocialRow
            onGoogle={googleAvailable ? () => promptAsync() : undefined}
            onApple={appleAvailable ? () => signInWithApple().catch((e) => setError(e.message)) : undefined}
          />

          <Text style={[styles.guestLink, { color: colors.inkSoft }]} onPress={continueAsGuest}>
            Explorar sin cuenta
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 26 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  headline: { marginTop: 28, fontSize: 30, fontWeight: "800", textAlign: "center", lineHeight: 36 },
  subtitle: { marginTop: 14, fontSize: 15, textAlign: "center", lineHeight: 21, paddingHorizontal: 10 },
  demoNotice: { marginTop: 14, fontSize: 12.5, textAlign: "center", fontWeight: "600", paddingHorizontal: 12 },
  guestLink: { marginTop: 18, fontSize: 13, textAlign: "center", fontWeight: "700", textDecorationLine: "underline" },
  actions: { paddingBottom: 18 },
});
