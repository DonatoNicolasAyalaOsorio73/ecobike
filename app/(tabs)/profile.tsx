import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeIn } from "react-native-reanimated";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassIconButton from "@/components/ui/GlassIconButton";
import ProgressRing from "@/components/ui/ProgressRing";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { dueCount } from "@/utils/maintenance";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { levelForPoints } from "@/utils/gamification";
import { uploadProfilePhoto } from "@/services/auth.service";
import { listFriendUids } from "@/services/social.service";
import { DEMO_FRIENDS } from "@/utils/demoData";
import { shareText } from "@/services/share";
import { inviteText } from "@/utils/shareText";

const LEVEL_TITLES = ["Biker Iniciante", "Biker Bronce", "Biker Plata", "Biker Oro", "Biker Platino", "Biker Diamante", "Biker Élite", "Leyenda EcoBike"];
const LEVEL_FLOOR = [0, 100, 300, 700, 1500, 3000, 6000, 12000];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const profile = useAuthStore((s) => s.profile);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const isGuest = useAuthStore((s) => s.isGuest);
  const signOut = useAuthStore((s) => s.signOut);
  const toast = useToastStore((s) => s.show);
  const localProfile = useLocalProfileStore();
  const userId = useCurrentUserId();
  const units = useSettingsStore((s) => s.units);
  const { points } = useAvailablePoints(userId);
  const { stats, refresh } = useRiderStats(userId, points);
  const [friendCount, setFriendCount] = useState<number | null>(isGuest ? DEMO_FRIENDS.length : null);
  const [uploading, setUploading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    if (!firebaseUser) return;
    setFriendCount(null);
    listFriendUids(firebaseUser.uid).then((f) => setFriendCount(f.length)).catch(() => setFriendCount(0));
  }, [firebaseUser]);

  const displayName = profile?.displayName ?? localProfile.displayName;
  const username = profile?.username ?? localProfile.username;
  const photoUrl = profile?.photoURL ?? localProfile.photoUri;
  const city = profile?.city ?? localProfile.city;
  const bikeType = profile?.bikeType ?? localProfile.bikeType;
  const bio = profile?.bio ?? localProfile.bio;
  const { level, nextLevelAt } = levelForPoints(points);
  const floor = LEVEL_FLOOR[level - 1] ?? 0;
  const levelProgress = nextLevelAt ? (points - floor) / (nextLevelAt - floor) : 1;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const maintenance = useSettingsStore((s) => s.maintenance);
  const bikeDue = Object.keys(maintenance).length ? dueCount(stats.totalDistanceMeters / 1000, maintenance) : 0;

  const onChangeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return toast("Permite el acceso a tus fotos para cambiar tu imagen.", "error");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    if (!firebaseUser) return localProfile.update({ photoUri: uri });
    setUploading(true);
    try {
      await uploadProfilePhoto(firebaseUser.uid, uri);
      await useAuthStore.getState().refreshProfile();
      toast("Foto actualizada.", "success");
    } catch {
      toast("No se pudo subir la foto. Inténtalo de nuevo.", "error");
    } finally {
      setUploading(false);
    }
  };

  const createAccount = async () => {
    await signOut(); // leaves guest mode; the welcome/register flow takes over
    router.replace("/(auth)/register");
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <Text style={[styles.header, { color: colors.ink }]} accessibilityRole="header">
              Perfil
            </Text>
            <GlassIconButton icon="settings-outline" accessibilityLabel="Ajustes" onPress={() => router.push("/settings")} size={44} />
          </View>

          <GlassCard intensity={45} style={styles.hero}>
            <Pressable onPress={onChangeAvatar} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil" style={styles.avatarWrap}>
              <ProgressRing progress={levelProgress} size={124} thickness={7}>
                <View style={[styles.avatar, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                  {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.avatarImage} /> : <Ionicons name="person" size={40} color={colors.primaryDark} />}
                  {uploading && (
                    <View style={[StyleSheet.absoluteFill, styles.uploading]}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                </View>
              </ProgressRing>
              <View style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.bgTop }]}>
                <Ionicons name="camera" size={14} color={colors.onPrimary} />
              </View>
            </Pressable>

            <Text style={[styles.name, { color: colors.ink }]}>{displayName}</Text>
            <Text style={{ color: colors.inkSoft, fontSize: 13.5, marginTop: 2 }}>@{username}</Text>
            {bio ? (
              <Text style={{ color: colors.ink, fontSize: 14, marginTop: 10, textAlign: "center", lineHeight: 20, paddingHorizontal: 8 }}>{bio}</Text>
            ) : null}

            <Text style={[styles.meta, { color: colors.inkSoft }]} numberOfLines={1}>
              {[`Nivel ${level} · ${levelTitle}`, city, bikeType].filter(Boolean).join("  ·  ")}
            </Text>

            <View style={[styles.statsRow, { borderTopColor: colors.divider }]}>
              <ProfileStat label={units === "metric" ? "km" : "mi"} value={Math.round((stats.totalDistanceMeters / 1000) * (units === "metric" ? 1 : 0.621371)).toLocaleString("es-CO")} />
              <ProfileStat label="recorridos" value={String(stats.totalRides)} />
              <ProfileStat label="amigos" value={friendCount === null ? "…" : String(friendCount)} />
            </View>
          </GlassCard>

          {isGuest && (
            <GlassCard style={{ marginTop: 16 }}>
              <View style={styles.ctaRow}>
                <Ionicons name="cloud-upload-outline" size={26} color={colors.primaryDark} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700" }}>Crea tu cuenta gratis</Text>
                  <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 2 }}>
                    Guarda tus recorridos en la nube, gana puntos reales y úsalos desde el teléfono o la web.
                  </Text>
                </View>
              </View>
              <GlassButton label="Crear cuenta" icon="person-add-outline" onPress={createAccount} style={{ marginTop: 12 }} />
            </GlassCard>
          )}

          {bikeDue > 0 && (
            <Pressable accessibilityRole="button" onPress={() => router.push("/settings/maintenance")} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
              <GlassCard style={[styles.ctaRow, { marginTop: 16 }]}>
                <View style={styles.bikeBadge}>
                  <Ionicons name="construct" size={18} color={colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: "700" }}>Tu bici necesita atención</Text>
                  <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 2 }}>
                    {bikeDue} {bikeDue === 1 ? "pieza toca" : "piezas tocan"} revisión según tus kilómetros.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.inkFaint} />
              </GlassCard>
            </Pressable>
          )}

          <View style={{ marginHorizontal: -20, marginTop: 16 }}>
            <EmailVerifyBanner />
          </View>

          {/* iOS grouped list instead of a tile grid: denser, scannable, no orphan tile. */}
          <GlassCard style={styles.actions} containerStyle={{ marginTop: 16 }}>
            <Action first icon="create-outline" label="Editar perfil" onPress={() => router.push("/settings/edit-profile")} delay={0} />
            <Action
              icon="person-add-outline"
              label="Invitar amigos"
              onPress={async () => {
                const r = await shareText(inviteText(username));
                if (r === "copied") toast("Invitación copiada al portapapeles.", "success");
              }}
              delay={160}
            />
            <Action icon="construct-outline" label="Mi bici" onPress={() => router.push("/settings/maintenance")} delay={180} />
            <Action icon="help-buoy-outline" label="Ayuda" onPress={() => router.push("/settings/help")} delay={200} />
          </GlassCard>

          <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.signOut, { opacity: pressed ? 0.5 : 1 }]}>
            <Text style={{ color: colors.danger, fontSize: 16, fontWeight: "500" }}>{isGuest ? "Salir del modo invitado" : "Cerrar sesión"}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, delay, first }: { icon: any; label: string; onPress: () => void; delay: number; first?: boolean }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(240).delay(delay)}>
      {!first && <View style={[styles.actionSep, { backgroundColor: colors.divider }]} />}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed, hovered }: any) => [styles.action, { opacity: pressed ? 0.55 : hovered ? 0.8 : 1 }]}
      >
        <View style={styles.actionIcon}>
          <Ionicons name={icon} size={17} color={colors.primaryDark} />
        </View>
        <Text style={{ color: colors.ink, fontWeight: "500", fontSize: 16, flex: 1 }}>{label}</Text>
        <Ionicons name="chevron-forward" size={17} color={colors.inkFaint} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bikeBadge: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#ADF14B" },
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 130 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  header: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  hero: { alignItems: "center", paddingTop: 28, paddingBottom: 22, paddingHorizontal: 22 },
  avatarWrap: { alignItems: "center", justifyContent: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  uploading: { backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  cameraBadge: { position: "absolute", bottom: 6, right: 6, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  name: { fontSize: 24, fontWeight: "700", marginTop: 16, letterSpacing: -0.4 },
  meta: { fontSize: 13, marginTop: 12 },
  statsRow: { flexDirection: "row", alignSelf: "stretch", marginTop: 22, paddingTop: 18, borderTopWidth: StyleSheet.hairlineWidth },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  actions: { paddingVertical: 2, paddingHorizontal: 14 },
  actionSep: { position: "absolute", top: 0, left: 44, right: 0, height: StyleSheet.hairlineWidth },
  action: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 11 },
  actionIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#ADF14B" },
  section: { fontSize: 20, fontWeight: "700", marginTop: 32, marginBottom: 12, letterSpacing: -0.3 },
  signOut: { alignItems: "center", paddingVertical: 14, marginTop: 28 },
});
