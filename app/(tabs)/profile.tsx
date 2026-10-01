import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInUp } from "react-native-reanimated";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import GlassIconButton from "@/components/ui/GlassIconButton";
import ProgressRing from "@/components/ui/ProgressRing";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import EmailVerifyBanner from "@/components/EmailVerifyBanner";
import StreakCard from "@/components/StreakCard";
import DuoProgressBar from "@/components/ui/DuoProgressBar";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useLocalProfileStore } from "@/stores/localProfileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { useCurrentUserId } from "@/hooks/useCurrentUserId";
import { useRiderStats } from "@/hooks/useRiderStats";
import { useAvailablePoints } from "@/hooks/useAvailablePoints";
import { distanceThisWeek, environmentalImpact } from "@/utils/rideStats";
import { levelForPoints } from "@/utils/gamification";
import { listUnlockedAchievements } from "@/services/db";
import { uploadProfilePhoto } from "@/services/auth.service";
import { listFriendUids } from "@/services/social.service";
import { ACHIEVEMENTS } from "@/types/achievement";
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
  const weeklyGoalKm = useSettingsStore((s) => s.weeklyGoalKm);
  const { points } = useAvailablePoints(userId);
  const { rides, stats, refresh } = useRiderStats(userId, points);
  const [friendCount, setFriendCount] = useState<number | null>(isGuest ? DEMO_FRIENDS.length : null);
  const [uploading, setUploading] = useState(false);
  const [recent, setRecent] = useState<{ code: string; unlockedAt: number }[]>([]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      if (userId) setRecent(listUnlockedAchievements(userId).sort((a, b) => b.unlockedAt - a.unlockedAt).slice(0, 4));
    }, [refresh, userId])
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
  const experience = profile?.experience ?? localProfile.experience;
  const { level, nextLevelAt } = levelForPoints(points);
  const floor = LEVEL_FLOOR[level - 1] ?? 0;
  const levelProgress = nextLevelAt ? (points - floor) / (nextLevelAt - floor) : 1;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
  const co2 = environmentalImpact(stats.totalDistanceMeters).co2Kg;
  const weekKm = distanceThisWeek(rides) / 1000;
  const memberSince = profile?.createdAt ? format(new Date(profile.createdAt), "MMMM yyyy", { locale: es }) : null;
  const recentDefs = useMemo(
    () => recent.map((r) => ({ ...r, def: ACHIEVEMENTS.find((a) => a.code === r.code) })).filter((r) => r.def),
    [recent]
  );

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

            <View style={styles.chips}>
              <Chip icon="trophy" text={`Nivel ${level} · ${levelTitle}`} strong />
              {city ? <Chip icon="location-outline" text={city} /> : null}
              {bikeType ? <Chip icon="bicycle-outline" text={bikeType} /> : null}
              {experience ? <Chip icon="trending-up" text={experience} /> : null}
            </View>
            <Text style={{ color: colors.inkFaint, fontSize: 12, marginTop: 8 }}>
              {nextLevelAt ? `${(nextLevelAt - points).toLocaleString("es-CO")} pts para el nivel ${level + 1}` : "Nivel máximo alcanzado"}
              {memberSince ? ` · Miembro desde ${memberSince}` : ""}
            </Text>

            <View style={[styles.statsRow, { borderTopColor: colors.divider }]}>
              <ProfileStat label={units === "metric" ? "km" : "mi"} value={Math.round((stats.totalDistanceMeters / 1000) * (units === "metric" ? 1 : 0.621371)).toLocaleString("es-CO")} />
              <ProfileStat label="recorridos" value={String(stats.totalRides)} />
              <ProfileStat label="amigos" value={friendCount === null ? "…" : String(friendCount)} />
              <ProfileStat label="kg CO₂" value={co2.toFixed(0)} />
            </View>
          </GlassCard>

          {isGuest && (
            <GlassCard style={{ marginTop: 14 }}>
              <View style={styles.ctaRow}>
                <Ionicons name="cloud-upload-outline" size={26} color={colors.primaryDark} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.ink, fontWeight: "800" }}>Crea tu cuenta gratis</Text>
                  <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 2 }}>
                    Guarda tus recorridos en la nube, gana puntos reales y úsalos desde el teléfono o la web.
                  </Text>
                </View>
              </View>
              <GlassButton label="Crear cuenta" icon="person-add-outline" onPress={createAccount} style={{ marginTop: 12 }} />
            </GlassCard>
          )}

          <View style={{ marginHorizontal: -20, marginTop: 14 }}>
            <EmailVerifyBanner />
          </View>

          <View style={styles.actions}>
            <Action icon="create-outline" label="Editar perfil" onPress={() => router.push("/settings/edit-profile")} delay={0} />
            <Action icon="time-outline" label="Historial" onPress={() => router.push("/history")} delay={40} />
            <Action icon="qr-code-outline" label="Mis códigos" onPress={() => router.push("/points/my-codes")} delay={80} />
            <Action icon="stats-chart-outline" label="Estadísticas" onPress={() => router.push("/(tabs)/stats")} delay={120} />
            <Action
              icon="person-add-outline"
              label="Invitar amigos"
              onPress={async () => {
                const r = await shareText(inviteText(username));
                if (r === "copied") toast("Invitación copiada al portapapeles.", "success");
              }}
              delay={160}
            />
            <Action icon="help-buoy-outline" label="Ayuda" onPress={() => router.push("/settings/help")} delay={200} />
          </View>

          <Text style={[styles.section, { color: colors.ink }]}>Tu racha</Text>
          <StreakCard rides={rides} />

          <Text style={[styles.section, { color: colors.ink }]}>Meta semanal</Text>
          <GlassCard>
            <View style={styles.weekRow}>
              <AnimatedNumber value={Math.round(weekKm * 10)} style={[styles.weekValue, { color: colors.ink }]} format={(v) => `${(v / 10).toFixed(1)} km`} />
              <Text style={{ color: colors.inkSoft }}>de {weeklyGoalKm} km</Text>
            </View>
            <DuoProgressBar value={weeklyGoalKm ? weekKm / weeklyGoalKm : 0} accent="green" />
          </GlassCard>

          {recentDefs.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.ink }]}>Logros recientes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {recentDefs.map((r, i) => (
                  <Animated.View key={r.code} entering={FadeInUp.delay(i * 60).springify().damping(16)}>
                    <GlassCard style={styles.badge}>
                      <View style={[styles.badgeIcon, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                        <Ionicons name={r.def!.icon as any} size={22} color={colors.primaryDark} />
                      </View>
                      <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 12.5, textAlign: "center", marginTop: 8 }} numberOfLines={2}>
                        {r.def!.title}
                      </Text>
                      <Text style={{ color: colors.inkFaint, fontSize: 11, marginTop: 2 }}>{format(new Date(r.unlockedAt), "d MMM", { locale: es })}</Text>
                    </GlassCard>
                  </Animated.View>
                ))}
              </ScrollView>
            </>
          )}

          {profile && (
            <>
              <Text style={[styles.section, { color: colors.ink }]}>Cuenta</Text>
              <GlassCard>
                <InfoRow icon="mail-outline" label="Correo" value={profile.email ?? "—"} />
                <InfoRow icon="shield-checkmark-outline" label="Verificación" value={firebaseUser?.emailVerified ? "Verificado" : "Pendiente"} />
                <InfoRow icon="star-outline" label="Rol" value={profile.role === "admin" ? "Administrador" : profile.role === "partner" ? "Tienda aliada" : "Ciclista"} last />
              </GlassCard>
            </>
          )}

          <GlassButton label="Ajustes" icon="settings-outline" variant="secondary" onPress={() => router.push("/settings")} style={{ marginTop: 20 }} />
          <GlassButton
            label={isGuest ? "Salir del modo invitado" : "Cerrar sesión"}
            icon="log-out-outline"
            variant="secondary"
            onPress={signOut}
            style={{ marginTop: 10, marginBottom: 120 }}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Chip({ icon, text, strong }: { icon: any; text: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: strong ? colors.glassGreenFill : colors.glassFillStrong, borderColor: strong ? colors.glassGreenBorder : colors.glassBorder }]}>
      <Ionicons name={icon} size={12} color={strong ? colors.primaryDark : colors.inkSoft} />
      <Text style={{ color: strong ? colors.primaryDark : colors.inkSoft, fontSize: 12, fontWeight: "700", marginLeft: 4 }}>{text}</Text>
    </View>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, delay }: { icon: any; label: string; onPress: () => void; delay: number }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify().damping(18)} style={styles.actionWrap}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
        <GlassCard style={styles.action}>
          <View style={[styles.actionIcon, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
            <Ionicons name={icon} size={20} color={colors.primaryDark} />
          </View>
          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 13, marginTop: 8 }}>{label}</Text>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

function InfoRow({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Ionicons name={icon} size={17} color={colors.primaryDark} />
      <Text style={{ color: colors.inkSoft, marginLeft: 10, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontWeight: "700", flexShrink: 1 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  header: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  hero: { alignItems: "center", paddingTop: 22 },
  avatarWrap: { alignItems: "center", justifyContent: "center" },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  uploading: { backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  cameraBadge: { position: "absolute", bottom: 6, right: 6, width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  name: { fontSize: 22, fontWeight: "800", marginTop: 12, letterSpacing: -0.3 },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 12 },
  chip: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statsRow: { flexDirection: "row", alignSelf: "stretch", marginTop: 18, paddingTop: 16, borderTopWidth: 1 },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 14 },
  actionWrap: { width: "47%", flexGrow: 1 },
  action: { alignItems: "flex-start" },
  actionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  section: { fontSize: 18, fontWeight: "800", marginTop: 22, marginBottom: 10 },
  weekRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 },
  weekValue: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  badge: { width: 116, alignItems: "center" },
  badgeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 11 },
});
