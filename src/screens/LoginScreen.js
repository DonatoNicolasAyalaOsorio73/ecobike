import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import BackgroundBlobs from "../components/BackgroundBlobs";
import BackButton from "../components/BackButton";
import GlassInput from "../components/GlassInput";
import GlassButton from "../components/GlassButton";
import SocialRow from "../components/SocialRow";
import Logo from "../components/Logo";
import { colors, radii, shadowStyle } from "../theme/colors";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.screen}>
      <BackgroundBlobs variant="auth" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <BackButton onPress={() => navigation.goBack()} />

            <View style={styles.logoWrap}>
              <Logo size="small" />
            </View>

            <Text style={styles.title}>Bienvenido de nuevo</Text>
            <Text style={styles.subtitle}>Inicia sesión para seguir pedaleando</Text>

            <BlurView intensity={35} tint="light" style={[styles.card, shadowStyle]}>
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
              />

              <Text
                style={styles.forgot}
                onPress={() => navigation.navigate("ForgotPassword")}
              >
                ¿Olvidaste tu contraseña?
              </Text>

              <GlassButton
                label="Iniciar sesión"
                icon="log-in-outline"
                variant="primary"
                onPress={() => {}}
              />

              <Text style={styles.registerLine}>
                ¿No tienes cuenta?{" "}
                <Text
                  style={styles.registerLink}
                  onPress={() => navigation.navigate("Register")}
                >
                  Regístrate
                </Text>
              </Text>
            </BlurView>

            <SocialRow onGoogle={() => {}} onApple={() => {}} onFacebook={() => {}} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgTop },
  safe: { flex: 1, paddingHorizontal: 24 },
  scroll: { paddingBottom: 32, paddingTop: 8 },
  logoWrap: { alignItems: "center", marginTop: 8 },
  title: {
    marginTop: 18,
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
    marginBottom: 18,
  },
  card: {
    borderRadius: radii.card,
    padding: 18,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  forgot: {
    textAlign: "right",
    color: colors.primaryDark,
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 16,
    marginTop: -2,
  },
  registerLine: {
    textAlign: "center",
    marginTop: 14,
    fontSize: 13.5,
    color: colors.inkSoft,
  },
  registerLink: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
