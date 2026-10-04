import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";

export default function NotFoundScreen() {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: "No encontrado" }} />
      <View style={styles.screen}>
        <BackgroundBlobs />
        <View style={styles.container}>
          <GlassCard style={{ alignItems: "center", padding: 28 }}>
            <Ionicons name="compass-outline" size={40} color={colors.inkSoft} />
            <Text style={[styles.title, { color: colors.ink }]}>Esta pantalla no existe.</Text>
            <GlassButton
              label="Volver al inicio"
              icon="home-outline"
              variant="primary"
              onPress={() => router.replace("/(tabs)/home")}
              style={{ marginTop: 20 }}
            />
          </GlassCard>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  title: { fontSize: 17, fontWeight: "700", marginTop: 14, textAlign: "center" },
});
