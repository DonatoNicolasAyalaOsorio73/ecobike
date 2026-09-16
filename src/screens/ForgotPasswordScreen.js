import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "../components/BackgroundBlobs";
import BackButton from "../components/BackButton";
import GlassInput from "../components/GlassInput";
import GlassButton from "../components/GlassButton";
import { colors, radii, shadowStyle } from "../theme/colors";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");

  return (
    <View style={styles.screen}>
      <BackgroundBlobs variant="auth" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <BackButton onPress={() => navigation.goBack()} />

          <View style={styles.center}>
            <BlurView intensity={35} tint="light" style={[styles.card, shadowStyle]}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed" size={26} color={colors.primaryDark} />
              </View>

              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.subtitle}>
                Ingresa tu correo y te enviaremos un enlace para restablecer
                tu contraseña.
              </Text>

              <GlassInput
                icon="mail-outline"
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerStyle={{ marginTop: 6 }}
              />

              <GlassButton
                label="Enviar enlace"
                icon="paper-plane-outline"
                variant="primary"
                onPress={() => {}}
                style={{ marginTop: 6 }}
              />
              <GlassButton
                label="Volver al inicio de sesión"
                icon="person-add-outline"
                variant="secondary"
                onPress={() => navigation.navigate("Login")}
                style={{ marginTop: 12 }}
              />

              <Text style={styles.contactLine}>
                ¿No recibiste el correo?{" "}
                <Text style={styles.contactLink}>Contáctanos</Text>
              </Text>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgTop },
  safe: { flex: 1, paddingHorizontal: 24, paddingTop: 4 },
  center: {
    flex: 1,
    justifyContent: "center",
  },
  card: {
    borderRadius: radii.card,
    padding: 24,
    alignItems: "center",
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glassGreenFill,
    borderWidth: 1,
    borderColor: colors.glassGreenBorder,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  contactLine: {
    marginTop: 16,
    fontSize: 13.5,
    color: colors.inkSoft,
  },
  contactLink: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
