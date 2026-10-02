import React from "react";
import { Image, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import PressableScale from "./PressableScale";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";

const SIZE = 36;

/** Account avatar in the nav bar (iOS 26: profile lives top-trailing, not in the tab bar). */
export default function ProfileButton() {
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const local = useLocalProfileStore();
  const name = profile?.displayName ?? local.displayName ?? "";
  const photo = profile?.photoURL ?? local.photoUri;

  return (
    <PressableScale
      depth={0.08}
      accessibilityLabel="Tu perfil"
      onPress={() => router.navigate("/(tabs)/profile")}
      style={[styles.ring, { borderColor: "rgba(255,255,255,0.95)", backgroundColor: colors.primary }]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.img} accessibilityIgnoresInvertColors />
      ) : (
        <Text style={[styles.initial, { color: colors.onPrimary }]}>{name.trim().slice(0, 1).toUpperCase() || "E"}</Text>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ring: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { width: "100%", height: "100%" },
  initial: { fontSize: 15, fontWeight: "700" },
});
