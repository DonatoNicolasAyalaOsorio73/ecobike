import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { ZoomIn } from "react-native-reanimated";
import { enter } from "@/theme/motion";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import { columnStyle, useLargeTitle } from "@/components/ui/LargeTitleScreen";
import GlassCard from "@/components/ui/GlassCard";
import GlassButton from "@/components/ui/GlassButton";
import ProgressRing from "@/components/ui/ProgressRing";
import { useTheme } from "@/theme/useTheme";
import { accents, elevation, type AccentName } from "@/theme/colors";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { fetchPublicProfiles, listFriendUids, removeFriend, type PublicProfile } from "@/services/social.service";
import { levelForPoints } from "@/utils/gamification";
import { DEMO_FRIENDS } from "@/utils/demoData";

const LEVEL_FLOOR = [0, 100, 300, 700, 1500, 3000, 6000, 12000];

/** A friend's public profile (only the fields in usuarios_public: no email, no rides, no location). */
export default function FriendProfileScreen() {
  const { colors } = useTheme();
  const { uid: friendUid } = useLocalSearchParams<{ uid: string }>();
  const me = useAuthStore((s) => s.firebaseUser?.uid);
  const toast = useToastStore((s) => s.show);
  const isDemo = !me || friendUid?.startsWith("demo_");
  const [friend, setFriend] = useState<PublicProfile | null | undefined>(undefined);
  const [rank, setRank] = useState<{ pos: number; of: number } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  // Hero carries the name; the compact nav title takes over once it scrolls away.
  const lt = useLargeTitle({ title: friend?.displayName ?? "", leading: <BackButton size={36} />, tabBar: false });

  useEffect(() => {
    if (!friendUid) return;
    if (isDemo) {
      const d = DEMO_FRIENDS.find((f) => f.uid === friendUid);
      setFriend(d ? { ...d, photoURL: null } : null);
      const sorted = [...DEMO_FRIENDS].sort((a, b) => b.points - a.points);
      setRank({ pos: sorted.findIndex((f) => f.uid === friendUid) + 1, of: sorted.length });
      return;
    }
    (async () => {
      try {
        const uids = await listFriendUids(me!);
        const all = await fetchPublicProfiles([...new Set([...uids, me!])]);
        const f = all.find((p) => p.uid === friendUid) ?? (await fetchPublicProfiles([friendUid]))[0] ?? null;
        setFriend(f);
        const sorted = all.sort((a, b) => b.points - a.points);
        const pos = sorted.findIndex((p) => p.uid === friendUid) + 1;
        if (pos > 0) setRank({ pos, of: sorted.length });
      } catch {
        setFriend(null);
      }
    })();
  }, [friendUid, me, isDemo]);

  if (friend === undefined) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (friend === null) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={{ color: colors.inkSoft }}>No se encontró este perfil.</Text>
      </View>
    );
  }

  const { level, nextLevelAt } = levelForPoints(friend.points);
  const floor = LEVEL_FLOOR[level - 1] ?? 0;
  const progress = nextLevelAt ? (friend.points - floor) / (nextLevelAt - floor) : 1;

  const onRemove = async () => {
    if (isDemo) return toast("En el modo de ejemplo no se pueden eliminar amigos.", "info");
    setBusy(true);
    try {
      await removeFriend(me!, friend.uid);
      toast(`Eliminaste a ${friend.displayName} de tus amigos.`, "success");
      router.canGoBack() ? router.back() : router.replace("/friends");
    } catch (e: any) {
      toast(e?.message ?? "No se pudo eliminar.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
        <Animated.ScrollView
          onScroll={lt.onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[lt.contentContainerStyle, styles.scroll, columnStyle]}
          showsVerticalScrollIndicator={lt.showsVerticalScrollIndicator}
        >
          <Animated.View entering={ZoomIn.springify().damping(16)} style={{ alignItems: "center" }}>
            <ProgressRing progress={progress} size={130} thickness={8}>
              <View style={[styles.avatar, { backgroundColor: accents.blue.soft, borderColor: "transparent" }]}>
                {friend.photoURL ? (
                  <Image source={{ uri: friend.photoURL }} style={StyleSheet.absoluteFill} />
                ) : (
                  <Text style={{ color: accents.blue.lip, fontSize: 40, fontWeight: "700" }}>{friend.displayName.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
            </ProgressRing>
          </Animated.View>
          <Animated.Text entering={enter(120)} style={[styles.name, { color: colors.ink }]}>
            {friend.displayName}
          </Animated.Text>
          <Text style={{ color: colors.inkSoft, textAlign: "center" }}>@{friend.username}</Text>

          <View style={styles.tiles}>
            <Tile accent="purple" icon="trending-up" value={`Nivel ${level}`} label="Nivel" delay={160} />
            <Tile accent="gold" icon="ribbon" value={friend.points.toLocaleString("es-CO")} label="Puntos totales" delay={220} />
            <Tile accent="orange" icon="flash" value={friend.weekPoints.toLocaleString("es-CO")} label="Esta semana" delay={280} />
            <Tile accent="blue" icon="podium" value={rank ? `#${rank.pos}` : "—"} label={rank ? `de ${rank.of} en tu grupo` : "Ranking"} delay={340} />
          </View>

          <GlassButton label="Enviar mensaje" icon="chatbubble-ellipses-outline" onPress={() => router.push(`/chat/${friend.uid}`)} style={{ marginTop: 22 }} />
          {confirm ? (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <GlassButton label="Cancelar" variant="secondary" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <GlassButton label="Eliminar" variant="danger" onPress={onRemove} loading={busy} style={{ flex: 1 }} />
            </View>
          ) : (
            <GlassButton label="Eliminar de amigos" icon="person-remove-outline" variant="secondary" onPress={() => setConfirm(true)} style={{ marginTop: 10 }} />
          )}

          <GlassCard containerStyle={{ marginTop: 22 }} entranceDelay={400}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <Ionicons name="lock-closed" size={16} color={colors.inkFaint} />
              <Text style={{ color: colors.inkSoft, fontSize: 12.5, flex: 1 }}>
                Por privacidad solo ves su nombre, foto y puntos. Sus recorridos y su ubicación nunca se comparten.
              </Text>
            </View>
          </GlassCard>
        </Animated.ScrollView>
        {lt.navBar}
    </View>
  );
}

function Tile({ accent, icon, value, label, delay }: { accent: AccentName; icon: keyof typeof Ionicons.glyphMap; value: string; label: string; delay: number }) {
  const a = accents[accent];
  return (
    <Animated.View entering={ZoomIn.delay(delay).springify().damping(16)} style={[styles.tile, elevation("low")]}>
      <Ionicons name={icon} size={20} color={a.lip} />
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20 },
  avatar: { width: 108, height: 108, borderRadius: 54, borderWidth: 3, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  name: { fontSize: 24, fontWeight: "700", textAlign: "center", marginTop: 14 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  tile: { flexBasis: "46%", flexGrow: 1, borderRadius: 18, padding: 14, gap: 4, backgroundColor: "rgba(255,255,255,0.78)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)" },
  tileValue: { fontSize: 20, fontWeight: "700", color: "#1F2A22" },
  tileLabel: { fontSize: 12, color: "#6B776F", fontWeight: "700" },
});
