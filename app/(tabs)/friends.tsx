import React, { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { isFirebaseConfigured } from "@/services/firebase";
import {
  acceptFriendRequest,
  listFriendUids,
  listIncomingFriendRequests,
  searchUserByUsername,
  sendFriendRequest,
} from "@/services/social.service";
import { fetchFriendsLeaderboard } from "@/services/rides.service";
import type { UserProfile } from "@/types/user";

function Avatar({ label, size = 44 }: { label: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder },
      ]}
    >
      <Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: size * 0.4 }}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export default function FriendsScreen() {
  const { colors } = useTheme();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<UserProfile | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<{ from: string }[]>([]);
  const [friendUids, setFriendUids] = useState<string[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ uid: string; displayName: string; totalPoints: number }[]>([]);

  const load = React.useCallback(async () => {
    if (!uid) return;
    setLoadError(null);
    try {
      const [incoming, friends] = await Promise.all([listIncomingFriendRequests(uid), listFriendUids(uid)]);
      setRequests(incoming);
      setFriendUids(friends);
      try {
        setLeaderboard(await fetchFriendsLeaderboard(friends));
      } catch {
        // Leaderboard reads another friend's ride history — not covered by
        // this project's current Firestore rules, so it's allowed to come
        // back empty instead of blocking the rest of the screen.
        setLeaderboard([]);
      }
    } catch (e: any) {
      setLoadError(e?.message ?? "No se pudo cargar tu lista de amigos.");
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onSearch = async () => {
    if (!query.trim()) return;
    setMessage(null);
    try {
      const result = await searchUserByUsername(query.trim());
      setSearchResult(result);
      if (!result) setMessage("No se encontró ningún usuario con ese nombre.");
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo buscar.");
    }
  };

  const onAdd = async () => {
    if (!uid || !searchResult) return;
    try {
      await sendFriendRequest(uid, searchResult.uid);
      setMessage(`Solicitud enviada a @${searchResult.username}.`);
      setSearchResult(undefined);
      setQuery("");
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo enviar la solicitud.");
    }
  };

  const onAccept = async (fromUid: string) => {
    if (!uid) return;
    try {
      await acceptFriendRequest(uid, fromUid);
      load();
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo aceptar la solicitud.");
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={[styles.header, { color: colors.ink }]}>Amigos</Text>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            isFirebaseConfigured ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {!isFirebaseConfigured ? (
            <GlassCard>
              <Text style={{ color: colors.inkSoft, textAlign: "center" }}>
                La función de amigos necesita un proyecto de Firebase configurado.
              </Text>
            </GlassCard>
          ) : (
            <>
              {loadError && (
                <GlassCard style={{ marginBottom: 12, alignItems: "center" }}>
                  <Ionicons name="cloud-offline-outline" size={22} color={colors.inkSoft} />
                  <Text style={{ color: colors.inkSoft, textAlign: "center", marginTop: 6, marginBottom: 12 }}>{loadError}</Text>
                  <GlassButton label="Reintentar" icon="refresh" variant="secondary" onPress={load} />
                </GlassCard>
              )}

              <GlassCard>
                <GlassInput
                  icon="search-outline"
                  placeholder="Buscar por nombre de usuario"
                  value={query}
                  onChangeText={setQuery}
                  autoCapitalize="none"
                  onSubmitEditing={onSearch}
                  returnKeyType="search"
                />
                <GlassButton label="Buscar" icon="search" variant="secondary" onPress={onSearch} />
                {message && <Text style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 10, textAlign: "center" }}>{message}</Text>}
                {searchResult && (
                  <View style={styles.resultRow}>
                    <Avatar label={searchResult.displayName} size={36} />
                    <Text style={{ color: colors.ink, fontWeight: "700", flex: 1, marginLeft: 10 }}>
                      {searchResult.displayName} (@{searchResult.username})
                    </Text>
                    <GlassButton label="Agregar" icon="person-add" variant="primary" onPress={onAdd} />
                  </View>
                )}
              </GlassCard>

              {requests.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>SUGERENCIAS PARA TI</Text>
                  {requests.map((r, i) => (
                    <GlassCard key={r.from} style={{ marginBottom: 10 }} entranceDelay={i * 40}>
                      <View style={styles.suggestionRow}>
                        <Avatar label={r.from} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ color: colors.ink, fontWeight: "700" }}>@{r.from}</Text>
                          <Text style={{ color: colors.inkSoft, fontSize: 12 }}>Sugerido para ti</Text>
                        </View>
                        <GlassButton label="Agregar" icon="person-add" variant="primary" onPress={() => onAccept(r.from)} />
                      </View>
                    </GlassCard>
                  ))}
                </>
              )}

              <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>TUS AMIGOS</Text>
              <GlassCard>
                {friendUids.length === 0 ? (
                  <Text style={{ color: colors.inkSoft, textAlign: "center", paddingVertical: 8 }}>
                    Todavía no tienes amigos agregados.
                  </Text>
                ) : (
                  friendUids.map((friendUid, i) => (
                    <Animated.View key={friendUid} entering={FadeInUp.duration(360).delay(i * 40).springify().damping(18)} style={styles.friendRow}>
                      <Avatar label={friendUid} />
                      <Text style={{ color: colors.ink, flex: 1, marginLeft: 12, fontWeight: "600" }}>@{friendUid}</Text>
                      <View style={[styles.followingPill, { backgroundColor: colors.glassFillStrong, borderColor: colors.glassBorder }]}>
                        <Ionicons name="checkmark" size={13} color={colors.inkSoft} />
                        <Text style={{ color: colors.inkSoft, fontSize: 11.5, fontWeight: "700", marginLeft: 3 }}>Siguiendo</Text>
                      </View>
                    </Animated.View>
                  ))
                )}
              </GlassCard>

              <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>RANKING DE AMIGOS</Text>
              <GlassCard>
                {leaderboard.length === 0 ? (
                  <Text style={{ color: colors.inkSoft, textAlign: "center", paddingVertical: 8 }}>
                    Agrega amigos para comparar progreso.
                  </Text>
                ) : (
                  leaderboard.map((entry, i) => (
                    <Animated.View key={entry.uid} entering={FadeInUp.duration(360).delay(i * 40).springify().damping(18)} style={styles.leaderRow}>
                      <Ionicons name="trophy" size={16} color={i === 0 ? colors.primaryDark : colors.inkFaint} />
                      <Text style={{ color: colors.ink, flex: 1, marginLeft: 10 }}>{entry.displayName}</Text>
                      <Text style={{ color: colors.inkSoft, fontSize: 12.5 }}>{entry.totalPoints} pts</Text>
                    </Animated.View>
                  ))
                )}
              </GlassCard>
            </>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: { fontSize: 24, fontWeight: "800", paddingHorizontal: 20, paddingTop: 8, marginBottom: 8 },
  scroll: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 18 },
  resultRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 10 },
  suggestionRow: { flexDirection: "row", alignItems: "center" },
  friendRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  leaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  followingPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
});
