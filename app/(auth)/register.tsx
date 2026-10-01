import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { useTheme } from "@/theme/useTheme";
import { signUpWithEmail } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const onSubmit = async () => {
    if (!isFirebaseConfigured) {
      setError("Esta app no tiene un proyecto de Firebase configurado todavía — usa \"Explorar sin cuenta\" para probarla ahora.");
      return;
    }
    if (!firstName.trim() || !email.trim() || !password) {
      setError("Completa nombre, correo y contraseña.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email.trim(), password, `${firstName.trim()} ${lastName.trim()}`.trim());
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

            <Text style={[styles.title, { color: colors.ink }]}>Crea tu cuenta</Text>
            <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
              Únete a la comunidad <Text style={{ color: colors.primaryDark, fontWeight: "700" }}>EcoBike</Text>
            </Text>

            <GlassCard>
              <GlassInput icon="person-outline" placeholder="Nombres" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
              <GlassInput icon="person-outline" placeholder="Apellidos" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              <GlassInput
                icon="mail-outline"
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <GlassInput icon="lock-closed-outline" placeholder="Contraseña" value={password} onChangeText={setPassword} secure />
              <GlassInput
                icon="lock-closed-outline"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secure
                errorText={error}
              />

              <GlassButton
                label="Crear cuenta"
                icon="person-add-outline"
                variant="primary"
                onPress={onSubmit}
                loading={loading}
                style={{ marginTop: 4 }}
              />

              <Text style={[styles.loginLine, { color: colors.inkSoft }]}>
                ¿Ya tienes cuenta?{" "}
                <Text style={[styles.loginLink, { color: colors.primaryDark }]} onPress={() => router.push("/(auth)/login")}>
                  Inicia sesión
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
    case "auth/email-already-in-use":
      return "Ya existe una cuenta con ese correo.";
    case "auth/invalid-email":
      return "El correo no es válido.";
    case "auth/weak-password":
      return "La contraseña es muy débil.";
    case "auth/network-request-failed":
      return "Sin conexión a internet. Verifica tu red e inténtalo de nuevo.";
    default:
      return "No se pudo crear la cuenta. Inténtalo de nuevo.";
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  scroll: { paddingBottom: 32, paddingTop: 8 },
  title: { marginTop: 22, fontSize: 26, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 14.5, marginBottom: 18 },
  loginLine: { textAlign: "center", marginTop: 14, fontSize: 13.5 },
  loginLink: { fontWeight: "700" },
  guestLink: { textAlign: "center", marginTop: 18, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
});
