import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import { SettingsNavRow, SettingsSwitchRow } from "@/components/ui/SettingsRow";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { formatDistance } from "@/utils/format";
import { isFirebaseConfigured } from "@/services/firebase";
import { sendPasswordReset, uploadProfilePhoto } from "@/services/auth.service";
import { listFriendUids } from "@/services/social.service";

const LEVEL_TITLES = ["Biker Iniciante", "Biker Bronce", "Biker Plata", "Biker Oro", "Biker Platino", "Biker Diamante", "Biker Élite", "Leyenda EcoBike"];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const isGuest = useAuthStore((s) => s.isGuest);
  const signOut = useAuthStore((s) => s.signOut);
  const localProfile = useLocalProfileStore();
  const settings = useSettingsStore();
  const userId = useCurrentUserId();
  const units = useSettingsStore((s) => s.units);
  const { points: availablePoints } = useAvailablePoints(userId);
  const { stats, level, refresh } = useRiderStats(userId, availablePoints);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  useEffect(() => {
    if (!firebaseUser) {
      setFriendCount(0);
      return;
    }
    // null while loading so a real account never flashes "0 amigos" before
    // the async Firestore read actually resolves — see friendCount usage
    // below, which shows a spinner glyph instead of 0 until this settles.
    setFriendCount(null);
    listFriendUids(firebaseUser.uid).then((f) => setFriendCount(f.length)).catch(() => setFriendCount(0));
  }, [firebaseUser]);

  const displayName = profile?.displayName ?? localProfile.displayName;
  const username = profile?.username ?? localProfile.username;
  const photoUrl = profile?.photoURL ?? localProfile.photoUri;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];

  const onChangeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;

    if (firebaseUser) {
      setUploading(true);
      try {
        await uploadProfilePhoto(firebaseUser.uid, uri);
        await useAuthStore.getState().refreshProfile();
      } finally {
        setUploading(false);
      }
    } else {
      await localProfile.update({ photoUri: uri });
    }
  };

  const onResetPassword = async () => {
    if (!profile?.email) return;
    await sendPasswordReset(profile.email);
    setResetSent(true);
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.header, { color: colors.ink }]}>Perfil</Text>

          <GlassCard style={styles.profileCard}>
            <View style={styles.pointsPillWrap}>
              <View style={[styles.pointsPill, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                <Ionicons name="ribbon-outline" size={13} color={colors.primaryDark} />
                <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 12, marginLeft: 4 }}>{availablePoints} pts</Text>
              </View>
            </View>

            <Pressable onPress={onChangeAvatar} style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={34} color={colors.primaryDark} />
                )}
              </View>
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.bgTop }]}>
                <Ionicons name="camera" size={13} color={colors.onPrimary} />
              </View>
            </Pressable>

            <Text style={[styles.name, { color: colors.ink }]}>{displayName}</Text>
            <Text style={[styles.username, { color: colors.inkSoft }]}>@{username}</Text>

            <View style={[styles.levelBadge, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
              <Text style={{ color: colors.primaryDark, fontWeight: "700", fontSize: 12 }}>{levelTitle}</Text>
            </View>

            <View style={styles.statsRow}>
              <ProfileStat label="km" value={formatDistance(stats.totalDistanceMeters, units).split(" ")[0]} />
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <ProfileStat label="rutas" value={String(stats.totalRides)} />
              <View style={[styles.divider, { backgroundColor: colors.divider }]} />
              <ProfileStat label="amigos" value={friendCount === null ? "…" : String(friendCount)} />
            </View>
          </GlassCard>

          {!profile && isGuest && isFirebaseConfigured && (
            <GlassButton
              label="Iniciar sesión"
              icon="log-in-outline"
              variant="primary"
              onPress={() => router.replace("/(auth)/welcome")}
              style={{ marginTop: 16 }}
            />
          )}

          <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>MI CUENTA</Text>
          <GlassCard>
            <SettingsNavRow icon="create-outline" label="Editar perfil" onPress={() => router.push("/settings/edit-profile")} />
            {profile?.email && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
                <SettingsNavRow icon="mail-outline" label={profile.email} onPress={() => {}} showChevron={false} />
              </>
            )}
          </GlassCard>

          <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>ACTIVIDAD</Text>
          <GlassCard>
            <SettingsNavRow icon="trophy-outline" label="Logros y nivel" sublabel={levelTitle} onPress={() => router.push("/(tabs)/stats")} />
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            <SettingsNavRow icon="time-outline" label="Historial de recorridos" onPress={() => router.push("/history")} />
          </GlassCard>

          <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>AJUSTES</Text>
          <GlassCard>
            <SettingsSwitchRow
              icon="moon-outline"
              label="Modo oscuro"
              value={settings.appearance === "dark"}
              onValueChange={(v) => settings.update({ appearance: v ? "dark" : "light" })}
            />
            {profile?.email && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
                <SettingsNavRow
                  icon="key-outline"
                  label="Restablecer contraseña"
                  sublabel={resetSent ? "Enlace enviado a tu correo" : undefined}
                  onPress={onResetPassword}
                />
              </>
            )}
            <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
            <SettingsNavRow icon="options-outline" label="Más ajustes" onPress={() => router.push("/settings")} />
            {profile && (
              <>
                <View style={[styles.rowDivider, { backgroundColor: colors.divider }]} />
                <SettingsNavRow icon="trash-outline" label="Eliminar cuenta" danger onPress={() => router.push("/settings/delete-account")} />
              </>
            )}
          </GlassCard>

          <GlassButton
            label="Cerrar sesión"
            icon="log-out-outline"
            variant="secondary"
            onPress={signOut}
            loading={uploading}
            style={{ marginTop: 20, marginBottom: 120 }}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 17, fontWeight: "800", color: colors.ink }}>{value}</Text>
      <Text style={{ fontSize: 11.5, color: colors.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  header: { fontSize: 24, fontWeight: "800", marginBottom: 14 },
  profileCard: { alignItems: "center", paddingVertical: 24, paddingTop: 16 },
  pointsPillWrap: { alignSelf: "flex-end", marginBottom: -8 },
  pointsPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  avatarWrap: { marginTop: 8 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  name: { fontSize: 18, fontWeight: "800", marginTop: 12 },
  username: { fontSize: 13, marginTop: 2 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginTop: 10 },
  statsRow: { flexDirection: "row", alignItems: "center", width: "100%", marginTop: 20 },
  divider: { width: 1, height: 28 },
  sectionLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 20 },
  rowDivider: { height: 1, marginLeft: 30 },
});
