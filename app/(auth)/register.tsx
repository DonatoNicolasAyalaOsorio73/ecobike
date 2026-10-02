import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import AuthScaffold, { AuthLink, Rise } from "@/components/auth/AuthScaffold";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { signUpWithEmail } from "@/services/auth.service";
import { isFirebaseConfigured } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { passwordStrength, validateEmail, validateName } from "@/utils/profileForm";

// Weak reads as an error; the rest step up through the brand lime (functional color).
const STRENGTH_COLORS = ["#E5484D", "#E5484D", "#CDF78C", "#B9F45F", "#ADF14B"];

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
    <AuthScaffold back logo={130} title="Crea tu cuenta" subtitle="Únete a la comunidad EcoBike" center={false}>
      <Rise index={1} style={styles.nameRow}>
        <GlassInput containerStyle={{ flex: 1 }} icon="person-outline" placeholder="Nombres" value={firstName} onChangeText={setFirstName} autoCapitalize="words" autoComplete="given-name" errorText={show(fieldErrors.firstName)} />
        <GlassInput containerStyle={{ flex: 1 }} placeholder="Apellidos" value={lastName} onChangeText={setLastName} autoCapitalize="words" autoComplete="family-name" />
      </Rise>
      <Rise index={2}>
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
      </Rise>
      <Rise index={3}>
        <GlassInput icon="lock-closed-outline" placeholder="Contraseña" value={password} onChangeText={setPassword} secure autoComplete="new-password" errorText={show(fieldErrors.password)} />
        {password.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.strength} accessibilityLabel={`Seguridad de la contraseña: ${strength.label}`}>
            <View style={styles.strengthBars}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={[styles.strengthBar, { backgroundColor: i < Math.max(1, strength.score) ? STRENGTH_COLORS[strength.score] : colors.divider }]} />
              ))}
            </View>
            <Text style={{ color: strength.score <= 1 ? colors.danger : colors.inkSoft, fontWeight: "600", fontSize: 12 }}>{strength.label}</Text>
          </Animated.View>
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
      </Rise>

      <Rise index={4}>
        <GlassButton label="Crear cuenta" onPress={onSubmit} loading={loading} style={{ marginTop: 8 }} />
        <Text style={[styles.legal, { color: colors.inkFaint }]}>
          Al continuar aceptas los <AuthLink onPress={() => router.push("/legal/terms")}>Términos</AuthLink> y la{" "}
          <AuthLink onPress={() => router.push("/legal/privacy")}>Política de privacidad</AuthLink>.
        </Text>
        <Text style={[styles.footer, { color: colors.inkSoft }]}>
          ¿Ya tienes cuenta? <AuthLink onPress={() => router.replace("/(auth)/login")}>Inicia sesión</AuthLink>
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
  nameRow: { flexDirection: "row", gap: 10 },
  strength: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -4, marginBottom: 14, marginHorizontal: 10 },
  strengthBars: { flex: 1, flexDirection: "row", gap: 5 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  legal: { textAlign: "center", marginTop: 16, fontSize: 12, lineHeight: 17 },
  footer: { textAlign: "center", marginTop: 18, fontSize: 13 },
});
