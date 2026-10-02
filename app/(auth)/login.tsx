import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import AuthScaffold, { AuthLink, Rise } from "@/components/auth/AuthScaffold";
import GlassInput from "@/components/ui/GlassInput";
import { validateEmail } from "@/utils/profileForm";
import GlassButton from "@/components/ui/GlassButton";
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
  // Which field the message belongs to: a bad email is shown under the email.
  const [errorOnEmail, setErrorOnEmail] = useState(false);
  const continueAsGuest = useAuthStore((s) => s.continueAsGuest);

  const onSubmit = async () => {
    if (!isFirebaseConfigured) {
      setError("Esta app no tiene un proyecto de Firebase configurado todavía — usa \"Explorar sin cuenta\" para probarla ahora.");
      return;
    }
    const emailError = validateEmail(email);
    setErrorOnEmail(!!emailError);
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
    <AuthScaffold back logo={210} title="Hola de nuevo" subtitle="Inicia sesión para seguir pedaleando">
      <Rise index={1}>
        <GlassInput
          icon="mail-outline"
          placeholder="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          errorText={errorOnEmail ? error : null}
        />
      </Rise>
      <Rise index={2}>
        <GlassInput
          icon="lock-closed-outline"
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="current-password"
          textContentType="password"
          onSubmitEditing={onSubmit}
          returnKeyType="go"
          errorText={errorOnEmail ? null : error}
        />
        <View style={styles.forgot}>
          <AuthLink align="right" onPress={() => router.push("/(auth)/forgot-password")}>
            ¿Olvidaste tu contraseña?
          </AuthLink>
        </View>
      </Rise>

      <Rise index={3}>
        <GlassButton label="Iniciar sesión" onPress={onSubmit} loading={loading} />
        <Text style={[styles.footer, { color: colors.inkSoft }]}>
          ¿No tienes cuenta? <AuthLink onPress={() => router.replace("/(auth)/register")}>Regístrate</AuthLink>
        </Text>
        {!isFirebaseConfigured && (
          <View style={{ marginTop: 18 }}>
            <AuthLink role="button" onPress={continueAsGuest}>Explorar sin cuenta</AuthLink>
          </View>
        )}
      </Rise>
    </AuthScaffold>
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
  forgot: { marginTop: -2, marginBottom: 24, paddingRight: 6 },
  footer: { textAlign: "center", marginTop: 22, fontSize: 13 },
});
