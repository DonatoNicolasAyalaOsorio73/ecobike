import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassInput from "@/components/ui/GlassInput";
import { validateEmail } from "@/utils/profileForm";
import GlassButton from "@/components/ui/GlassButton";
import GlassCard from "@/components/ui/GlassCard";
import { useTheme } from "@/theme/useTheme";
import { sendPasswordReset } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!isFirebaseConfigured) {
      setError("Esta app no tiene un proyecto de Firebase configurado todavía.");
      return;
    }
    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch {
      // Deliberately vague: don't reveal whether an email is registered.
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs variant="auth" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <BackButton />

          <View style={styles.center}>
            <GlassCard style={{ alignItems: "center", padding: 24 }}>
              <View style={[styles.iconCircle, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                <Ionicons name={sent ? "checkmark-circle" : "lock-closed"} size={26} color={colors.primaryDark} />
              </View>

              <Text style={[styles.title, { color: colors.ink }]}>
                {sent ? "Revisa tu correo" : "Recuperar contraseña"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
                {sent
                  ? "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña."
                  : "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña."}
              </Text>

              {!sent && (
                <GlassInput
                  icon="mail-outline"
                  placeholder="Correo electrónico"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  containerStyle={{ marginTop: 6, width: "100%" }}
                  errorText={error}
                />
              )}

              {!sent ? (
                <GlassButton
                  label="Enviar enlace"
                  icon="paper-plane-outline"
                  variant="primary"
                  onPress={onSubmit}
                  loading={loading}
                  style={{ marginTop: 6, width: "100%" }}
                />
              ) : null}
              <GlassButton
                label="Volver al inicio de sesión"
                icon="log-in-outline"
                variant="secondary"
                onPress={() => router.replace("/(auth)/login")}
                style={{ marginTop: 12, width: "100%" }}
              />
            </GlassCard>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 4 },
  center: { flex: 1, justifyContent: "center" },
  iconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { marginTop: 8, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 18, paddingHorizontal: 4 },
});
