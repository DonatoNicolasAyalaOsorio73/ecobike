import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { ZoomIn } from "react-native-reanimated";
import AuthScaffold, { AuthLink, Rise } from "@/components/auth/AuthScaffold";
import GlassInput from "@/components/ui/GlassInput";
import { validateEmail } from "@/utils/profileForm";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { type } from "@/theme/typography";
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
    <AuthScaffold back logo={150}>
      <Rise index={0} style={{ alignItems: "center" }}>
        {/* State icon swaps with a spring when the link is sent. */}
        <Animated.View key={sent ? "sent" : "ask"} entering={ZoomIn.springify().damping(16)} style={[styles.iconCircle, { backgroundColor: "rgba(20,23,26,0.05)" }]}>
          <Ionicons name={sent ? "checkmark" : "key-outline"} size={26} color={colors.ink} />
        </Animated.View>
        <Text style={[type.title1, styles.center, { color: colors.ink }]} accessibilityRole="header">
          {sent ? "Revisa tu correo" : "Recupera tu acceso"}
        </Text>
        <Text style={[type.subhead, styles.subtitle, { color: colors.inkSoft }]}>
          {sent
            ? "Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña."
            : "Te enviaremos un enlace para restablecer tu contraseña."}
        </Text>
      </Rise>

      <Rise index={1}>
        {!sent && (
          <>
            <GlassInput
              icon="mail-outline"
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              onSubmitEditing={onSubmit}
              returnKeyType="send"
              errorText={error}
            />
            <GlassButton label="Enviar enlace" onPress={onSubmit} loading={loading} style={{ marginTop: 8 }} />
          </>
        )}
        <View style={{ marginTop: sent ? 4 : 22 }}>
          {sent ? (
            <GlassButton label="Volver a iniciar sesión" variant="secondary" onPress={() => router.replace("/(auth)/login")} />
          ) : (
            <AuthLink onPress={() => router.replace("/(auth)/login")}>Volver a iniciar sesión</AuthLink>
          )}
        </View>
      </Rise>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginTop: 8, marginBottom: 18 },
  center: { textAlign: "center" },
  subtitle: { textAlign: "center", marginTop: 8, marginBottom: 26, lineHeight: 20, paddingHorizontal: 8 },
});
