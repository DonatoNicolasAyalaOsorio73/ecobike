import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { updateUserProfile } from "@/services/auth.service";
import { api } from "@/services/api";

const BIKE_TYPES = ["Urbana", "Montaña", "Ruta", "Eléctrica", "BMX"];

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const localProfile = useLocalProfileStore();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? localProfile.displayName);
  const [city, setCity] = useState(profile?.city ?? localProfile.city ?? "");
  const [bikeType, setBikeType] = useState(profile?.bikeType ?? localProfile.bikeType ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (firebaseUser) {
        const wanted = username.trim().replace(/^@/, "").toLowerCase();
        if (wanted && wanted !== profile?.username) await api("me", "POST", { username: wanted });
        await updateUserProfile(firebaseUser.uid, { displayName: displayName.trim(), city: city.trim(), bikeType });
        await refreshProfile();
      } else {
        await localProfile.update({ displayName: displayName.trim() || "Ciclista invitado", city: city.trim(), bikeType });
      }
      router.back();
    } catch (err: any) {
      setError(err?.message ?? "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <BackButton />
            <Text style={[styles.header, { color: colors.ink }]}>Editar perfil</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <GlassCard>
              <GlassInput icon="person-outline" placeholder="Nombre para mostrar" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
              {firebaseUser && (
                <GlassInput
                  icon="at-outline"
                  placeholder="Nombre de usuario"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  errorText={error}
                />
              )}
              <GlassInput icon="location-outline" placeholder="Ciudad" value={city} onChangeText={setCity} autoCapitalize="words" />
            </GlassCard>

            <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>TIPO DE BICICLETA</Text>
            <GlassCard>
              <View style={styles.pillRow}>
                {BIKE_TYPES.map((type) => {
                  const active = bikeType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setBikeType(active ? "" : type)}
                      style={[
                        styles.pill,
                        { backgroundColor: active ? colors.glassGreenFill : "transparent", borderColor: active ? colors.glassGreenBorder : colors.divider },
                      ]}
                    >
                      {active && <Ionicons name="checkmark" size={13} color={colors.primaryDark} style={{ marginRight: 4 }} />}
                      <Text style={{ color: active ? colors.primaryDark : colors.inkSoft, fontSize: 12.5, fontWeight: "700" }}>{type}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </GlassCard>

            <GlassButton label="Guardar cambios" icon="checkmark-outline" variant="primary" onPress={onSave} loading={saving} style={{ marginTop: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 4 },
  header: { fontSize: 17, fontWeight: "800" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },
  sectionLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 18 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
