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
import { colors, radii, shadowStyle } from "../theme/colors";

export default function RegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthDate: "",
  });

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

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

            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>
              Únete a la comunidad{" "}
              <Text style={{ color: colors.primary, fontWeight: "700" }}>
                EcoBike
              </Text>
            </Text>

            <BlurView intensity={35} tint="light" style={[styles.card, shadowStyle]}>
              <GlassInput
                icon="person-outline"
                placeholder="Nombres"
                value={form.firstName}
                onChangeText={set("firstName")}
                autoCapitalize="words"
              />
              <GlassInput
                icon="person-outline"
                placeholder="Apellidos"
                value={form.lastName}
                onChangeText={set("lastName")}
                autoCapitalize="words"
              />
              <GlassInput
                icon="mail-outline"
                placeholder="Correo electrónico"
                value={form.email}
                onChangeText={set("email")}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <GlassInput
                icon="lock-closed-outline"
                placeholder="Contraseña"
                value={form.password}
                onChangeText={set("password")}
                secure
              />
              <GlassInput
                icon="lock-closed-outline"
                placeholder="Confirmar contraseña"
                value={form.confirmPassword}
                onChangeText={set("confirmPassword")}
                secure
              />
              <GlassInput
                icon="calendar-outline"
                placeholder="Fecha de nacimiento"
                value={form.birthDate}
                onChangeText={set("birthDate")}
              />
              <GlassInput
                icon="people-outline"
                placeholder="Género"
                rightChevron
                editable={false}
              />

              <GlassButton
                label="Crear cuenta"
                icon="person-add-outline"
                variant="primary"
                onPress={() => {}}
                style={{ marginTop: 4 }}
              />

              <Text style={styles.loginLine}>
                ¿Ya tienes cuenta?{" "}
                <Text
                  style={styles.loginLink}
                  onPress={() => navigation.navigate("Login")}
                >
                  Inicia sesión
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
  title: {
    marginTop: 22,
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14.5,
    color: colors.inkSoft,
    marginBottom: 18,
  },
  card: {
    borderRadius: radii.card,
    padding: 18,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  loginLine: {
    textAlign: "center",
    marginTop: 14,
    fontSize: 13.5,
    color: colors.inkSoft,
  },
  loginLink: {
    color: colors.primaryDark,
    fontWeight: "700",
  },
});
