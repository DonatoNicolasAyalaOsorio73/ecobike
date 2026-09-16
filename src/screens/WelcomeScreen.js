import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BackgroundBlobs from "../components/BackgroundBlobs";
import GlassButton from "../components/GlassButton";
import SocialRow from "../components/SocialRow";
import Logo from "../components/Logo";
import { colors } from "../theme/colors";

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Logo size="large" />

          <Text style={styles.headline}>
            Muévete mejor.{"\n"}
            Vive <Text style={{ color: colors.primary }}>sostenible.</Text>
          </Text>

          <Text style={styles.subtitle}>
            Pedalea, acumula puntos y canjéalos en tus tiendas favoritas.
          </Text>
        </View>

        <View style={styles.actions}>
          <GlassButton
            label="Ya tengo cuenta"
            icon="log-in-outline"
            variant="primary"
            onPress={() => navigation.navigate("Login")}
            style={{ marginBottom: 12 }}
          />
          <GlassButton
            label="Registrarme"
            icon="person-add-outline"
            variant="secondary"
            onPress={() => navigation.navigate("Register")}
          />

          <SocialRow
            onGoogle={() => {}}
            onApple={() => {}}
            onFacebook={() => {}}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgTop },
  safe: { flex: 1, justifyContent: "space-between", paddingHorizontal: 26 },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  headline: {
    marginTop: 28,
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 14,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 10,
  },
  actions: {
    paddingBottom: 18,
  },
});
