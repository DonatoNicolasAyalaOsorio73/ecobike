import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { api } from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";

export default function DeleteAccountScreen() {
  const { colors } = useTheme();
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const deleteLocalDataOnly = useAuthStore((s) => s.deleteLocalDataOnly);
  const signOut = useAuthStore((s) => s.signOut);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      // Server deletes Firestore data, avatar, friend links and the Auth
      // user (api/account.js). Local data is wiped only after that succeeds.
      await api("account", "DELETE");
      deleteLocalDataOnly();
      await signOut().catch(() => {});
      router.replace("/(auth)/welcome");
    } catch (e: any) {
      setError(e?.message ?? "No se pudo eliminar la cuenta. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs variant="auth" />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <BackButton />
        <View style={styles.center}>
          <GlassCard style={{ alignItems: "center", padding: 24 }}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(229,72,77,0.12)", borderColor: colors.danger }]}>
              <Ionicons name="warning" size={26} color={colors.danger} />
            </View>
            <Text style={[styles.title, { color: colors.ink }]}>Eliminar cuenta</Text>
            <Text style={[styles.subtitle, { color: colors.inkSoft }]}>
              Esto elimina tu cuenta y todos tus recorridos guardados en este dispositivo de forma permanente. Esta acción no se puede deshacer.
            </Text>

            {error && <Text style={{ color: colors.danger, fontSize: 12.5, textAlign: "center", marginBottom: 10 }}>{error}</Text>}

            {!confirming ? (
              <GlassButton label="Continuar" icon="arrow-forward" variant="danger" onPress={() => setConfirming(true)} style={{ width: "100%" }} />
            ) : (
              <GlassButton
                label="Sí, eliminar mi cuenta permanentemente"
                icon="trash"
                variant="danger"
                onPress={onDelete}
                loading={loading}
                style={{ width: "100%" }}
              />
            )}
            <GlassButton label="Cancelar" variant="secondary" onPress={() => router.back()} style={{ width: "100%", marginTop: 10 }} />
          </GlassCard>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: "center" },
  iconCircle: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13.5, textAlign: "center", marginTop: 8, marginBottom: 18, lineHeight: 19 },
});
