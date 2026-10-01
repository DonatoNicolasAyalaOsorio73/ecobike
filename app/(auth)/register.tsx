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
import { passwordStrength, validateEmail, validateName } from "@/utils/profileForm";

const STRENGTH_COLORS = ["#FF4B4B", "#FF9600", "#FFC800", "#58CC02", "#46A302"];

export default function RegisterScreen() {
  const { colors } = useTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const strength = passwordStrength(password);
  const fieldErrors = {
    firstName: validateName(firstName, "nombre"),
    email: validateEmail(email),
    password: strength.error,
    confirm: confirmPassword !== password ? "Las contraseñas no coinciden." : null,
  };
  const show = (e: string | null) => (submitted ? e : null);

  const onSubmit = async () => {
    if (!isFirebaseConfigured) {
      setError("Esta app no tiene un proyecto de Firebase configurado todavía — usa \"Explorar sin cuenta\" para probarla ahora.");
      return;
    }
    setSubmitted(true);
    if (Object.values(fieldErrors).some(Boolean)) return;
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
              <GlassInput icon="person-outline" placeholder="Nombres" value={firstName} onChangeText={setFirstName} autoCapitalize="words" errorText={show(fieldErrors.firstName)} />
              <GlassInput icon="person-outline" placeholder="Apellidos" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
              <GlassInput
                icon="mail-outline"
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                errorText={show(fieldErrors.email)}
              />
              <GlassInput icon="lock-closed-outline" placeholder="Contraseña" value={password} onChangeText={setPassword} secure autoComplete="new-password" errorText={show(fieldErrors.password)} />
              {password.length > 0 && (
                <View style={styles.strength} accessibilityLabel={`Seguridad de la contraseña: ${strength.label}`}>
                  <View style={styles.strengthBars}>
                    {[0, 1, 2, 3].map((i) => (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: i < Math.max(1, strength.score) ? STRENGTH_COLORS[strength.score] : "#E6EAE3" }]} />
                    ))}
                  </View>
                  <Text style={{ color: STRENGTH_COLORS[strength.score], fontWeight: "800", fontSize: 12 }}>{strength.label}</Text>
                </View>
              )}
              <GlassInput
                icon="lock-closed-outline"
                placeholder="Confirmar contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secure
                autoComplete="new-password"
                errorText={show(fieldErrors.confirm) ?? error}
              />

              <GlassButton
                label="Crear cuenta"
                icon="person-add-outline"
                variant="primary"
                onPress={onSubmit}
                loading={loading}
                style={{ marginTop: 4 }}
              />

              <Text style={[styles.loginLine, { color: colors.inkFaint, fontSize: 12 }]}>
                Al crear tu cuenta aceptas los{" "}
                <Text style={{ color: colors.primaryDark, fontWeight: "700" }} onPress={() => router.push("/legal/terms")}>
                  Términos de uso
                </Text>{" "}
                y la{" "}
                <Text style={{ color: colors.primaryDark, fontWeight: "700" }} onPress={() => router.push("/legal/privacy")}>
                  Política de privacidad
                </Text>
                .
              </Text>

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
  strength: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -4, marginBottom: 12, marginHorizontal: 8 },
  strengthBars: { flex: 1, flexDirection: "row", gap: 5 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  scroll: { paddingBottom: 32, paddingTop: 8 },
  title: { marginTop: 22, fontSize: 26, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 14.5, marginBottom: 18 },
  loginLine: { textAlign: "center", marginTop: 14, fontSize: 13.5 },
  loginLink: { fontWeight: "700" },
  guestLink: { textAlign: "center", marginTop: 18, fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
});
