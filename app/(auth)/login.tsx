import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassInput from "@/components/ui/GlassInput";
import { validateEmail } from "@/utils/profileForm";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import Logo from "@/components/ui/Logo";
import { useTheme } from "@/theme/useTheme";
import { signInWithEmail } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

export default function LoginScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const onSubmit = async () => {
    if (!isFirebaseConfigured) {
      setError("Esta app no tiene un proyecto de Firebase configurado todavía — usa \"Explorar sin cuenta\" para probarla ahora.");
      return;
    }
    const emailError = validateEmail(email);
    if (emailError || !password) {
      setError(emailError ?? "Ingresa tu contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      // authStore's onAuthStateChanged listener handles the redirect to (tabs)
    } catch (e: any) {
      setError(mapAuthError(e?.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs variant="auth" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <BackButton />

            <View style={styles.logoWrap}>
              <Logo size="small" />
            </View>

            <Text style={[styles.title, { color: colors.ink }]}>Bienvenido de nuevo</Text>
            <Text style={[styles.subtitle, { color: colors.inkSoft }]}>Inicia sesión para seguir pedaleando</Text>

            <GlassCard>
              <GlassInput
                icon="mail-outline"
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <GlassInput
                icon="lock-closed-outline"
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secure
                errorText={error}
              />

              <Text
                style={[styles.forgot, { color: colors.primaryDark }]}
                onPress={() => router.push("/(auth)/forgot-password")}
              >
                ¿Olvidaste tu contraseña?
              </Text>

              <GlassButton
                label="Iniciar sesión"
                icon="log-in-outline"
                variant="primary"
                onPress={onSubmit}
                loading={loading}
              />

              <Text style={[styles.registerLine, { color: colors.inkSoft }]}>
                ¿No tienes cuenta?{" "}
                <Text style={[styles.registerLink, { color: colors.primaryDark }]} onPress={() => router.push("/(auth)/register")}>
                  Regístrate
                </Text>
              </Text>
            </GlassCard>

            {!isFirebaseConfigured && (
              <Text style={[styles.guestLink, { color: colors.inkSoft }]} onPress={continueAsGuest}>
                O continúa explorando sin cuenta →
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function mapAuthError(code?: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/network-request-failed":
      return "Sin conexión a internet. Verifica tu red e inténtalo de nuevo.";
    default:
      return "No se pudo iniciar sesión. Inténtalo de nuevo.";
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  scroll: { paddingBottom: 32, paddingTop: 8 },
  logoWrap: { alignItems: "center", marginTop: 8 },
  title: { marginTop: 18, fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { marginTop: 4, fontSize: 14, textAlign: "center", marginBottom: 18 },
  forgot: { textAlign: "right", fontWeight: "600", fontSize: 13, marginBottom: 16, marginTop: -2 },
  registerLine: { textAlign: "center", marginTop: 14, fontSize: 13.5 },
  registerLink: { fontWeight: "700" },
  guestLink: { textAlign: "center", marginTop: 18, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
});
