import React, { useCallback, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
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
  fetchPublicProfiles,
  listFriendUids,
  listIncomingFriendRequests,
  rejectFriendRequest,
  removeFriend,
  searchUserByUsername,
  sendFriendRequest,
  type PublicProfile,
} from "@/services/social.service";
import type { UserProfile } from "@/types/user";

function Avatar({ label, photoURL, size = 44 }: { label: string; photoURL?: string | null; size?: number }) {
  const { colors } = useTheme();
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (photoURL) return <Image source={{ uri: photoURL }} style={box} accessibilityIgnoresInvertColors />;
  return (
    <View style={[styles.avatar, box, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
      <Text style={{ color: colors.primaryDark, fontWeight: "800", fontSize: size * 0.4 }}>{label.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

export default function FriendsScreen() {
  const { colors } = useTheme();
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const me = useAuthStore((s) => s.profile);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<UserProfile | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<PublicProfile[]>([]);
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoadError(null);
    try {
      const [incoming, friendUids] = await Promise.all([listIncomingFriendRequests(uid), listFriendUids(uid)]);
      const [req, fr] = await Promise.all([
        fetchPublicProfiles(incoming.map((r) => r.from)),
        fetchPublicProfiles(friendUids),
      ]);
      setRequests(req);
      setFriends(fr);
    } catch (e: any) {
      setLoadError(e?.message ?? "No se pudo cargar tu lista de amigos.");
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const run = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      if (ok) setMessage(ok);
      await load();
    } catch (e: any) {
      setMessage(e?.message ?? "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setBusy(null);
    }
  };

  const onSearch = async () => {
    const q = query.trim().replace(/^@/, "");
    if (!q) return;
    setMessage(null);
    try {
      const result = await searchUserByUsername(q);
      if (result?.uid === uid) {
        setSearchResult(undefined);
        setMessage("Ese eres tú.");
        return;
      }
      setSearchResult(result);
      if (!result) setMessage("No se encontró ningún usuario con ese nombre.");
    } catch (e: any) {
      setMessage(e?.message ?? "No se pudo buscar.");
    }
  };

  const onAdd = () => {
    if (!uid || !searchResult) return;
    const target = searchResult;
    run(
      "add",
      async () => {
        await sendFriendRequest(uid, target.uid);
        setSearchResult(undefined);
        setQuery("");
      },
      `Solicitud enviada a @${target.username}.`
    );
  };

  const alreadyFriend = !!searchResult && friends.some((f) => f.uid === searchResult.uid);

  // Ranking: friends plus me, by shared points balance.
  const ranking = [
    ...friends,
    ...(uid && me ? [{ uid, displayName: `${me.displayName} (tú)`, username: me.username, photoURL: me.photoURL, points: me.puntosAcumulados }] : []),
  ].sort((a, b) => b.points - a.points);

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <Text style={[styles.header, { color: colors.ink }]} accessibilityRole="header">
          Amigos
        </Text>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            isFirebaseConfigured && uid ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
            ) : undefined
          }
        >
          {!isFirebaseConfigured || !uid ? (
            <GlassCard>
              <Text style={{ color: colors.inkSoft, textAlign: "center" }}>
                Inicia sesión para agregar amigos y comparar tu progreso.
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
                  autoCorrect={false}
                  onSubmitEditing={onSearch}
                  returnKeyType="search"
                />
                <GlassButton label="Buscar" icon="search" variant="secondary" onPress={onSearch} />
                {me?.username ? (
                  <Text style={{ color: colors.inkFaint, fontSize: 12, marginTop: 10, textAlign: "center" }}>
                    Tu usuario: @{me.username}
                  </Text>
                ) : null}
                {message && (
                  <Text accessibilityLiveRegion="polite" style={{ color: colors.inkSoft, fontSize: 12.5, marginTop: 10, textAlign: "center" }}>
                    {message}
                  </Text>
                )}
                {searchResult && (
                  <View style={styles.resultRow}>
                    <Avatar label={searchResult.displayName} photoURL={searchResult.photoURL} size={36} />
                    <Text style={{ color: colors.ink, fontWeight: "700", flex: 1 }}>
                      {searchResult.displayName} (@{searchResult.username})
                    </Text>
                    {alreadyFriend ? (
                      <Text style={{ color: colors.inkSoft, fontSize: 12 }}>Ya son amigos</Text>
                    ) : (
                      <GlassButton label="Agregar" icon="person-add" variant="primary" onPress={onAdd} loading={busy === "add"} />
                    )}
                  </View>
                )}
              </GlassCard>

              {requests.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>SOLICITUDES ({requests.length})</Text>
                  {requests.map((r, i) => (
                    <GlassCard key={r.uid} style={{ marginBottom: 10 }} entranceDelay={i * 40}>
                      <View style={styles.row}>
                        <Avatar label={r.displayName} photoURL={r.photoURL} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ color: colors.ink, fontWeight: "700" }}>{r.displayName}</Text>
                          <Text style={{ color: colors.inkSoft, fontSize: 12 }}>@{r.username} quiere ser tu amigo</Text>
                        </View>
                      </View>
                      <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
                        <GlassButton
                          label="Aceptar"
                          icon="checkmark"
                          variant="primary"
                          loading={busy === `acc-${r.uid}`}
                          onPress={() => run(`acc-${r.uid}`, () => acceptFriendRequest(uid, r.uid), `Ahora eres amigo de ${r.displayName}.`)}
                          style={{ flex: 1 }}
                        />
                        <GlassButton
                          label="Rechazar"
                          icon="close"
                          variant="secondary"
                          loading={busy === `rej-${r.uid}`}
                          onPress={() => run(`rej-${r.uid}`, () => rejectFriendRequest(uid, r.uid))}
                          style={{ flex: 1 }}
                        />
                      </View>
                    </GlassCard>
                  ))}
                </>
              )}

              <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>TUS AMIGOS ({friends.length})</Text>
              <GlassCard>
                {friends.length === 0 ? (
                  <Text style={{ color: colors.inkSoft, textAlign: "center", paddingVertical: 8 }}>
                    Todavía no tienes amigos. Búscalos por su nombre de usuario.
                  </Text>
                ) : (
                  friends.map((f, i) => {
                    const confirming = confirmRemove === f.uid;
                    return (
                      <Animated.View key={f.uid} entering={FadeInUp.duration(360).delay(i * 40).springify().damping(18)} style={styles.friendRow}>
                        <Avatar label={f.displayName} photoURL={f.photoURL} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ color: colors.ink, fontWeight: "600" }}>{f.displayName}</Text>
                          <Text style={{ color: colors.inkSoft, fontSize: 12 }}>@{f.username} · {f.points} pts</Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={confirming ? `Confirmar eliminar a ${f.displayName}` : `Eliminar a ${f.displayName}`}
                          hitSlop={8}
                          onPress={() =>
                            confirming
                              ? run(`rm-${f.uid}`, () => removeFriend(uid, f.uid)).then(() => setConfirmRemove(null))
                              : setConfirmRemove(f.uid)
                          }
                          style={[
                            styles.pill,
                            confirming
                              ? { backgroundColor: "rgba(229,72,77,0.12)", borderColor: colors.danger }
                              : { backgroundColor: colors.glassFillStrong, borderColor: colors.glassBorder },
                          ]}
                        >
                          <Ionicons name={confirming ? "trash" : "person-remove-outline"} size={13} color={confirming ? colors.danger : colors.inkSoft} />
                          {confirming && <Text style={{ color: colors.danger, fontSize: 11.5, fontWeight: "700", marginLeft: 4 }}>Eliminar</Text>}
                        </Pressable>
                      </Animated.View>
                    );
                  })
                )}
              </GlassCard>

              <Text style={[styles.sectionLabel, { color: colors.inkFaint }]}>RANKING</Text>
              <GlassCard>
                {friends.length === 0 ? (
                  <Text style={{ color: colors.inkSoft, textAlign: "center", paddingVertical: 8 }}>
                    Agrega amigos para comparar progreso.
                  </Text>
                ) : (
                  ranking.map((entry, i) => (
                    <View key={entry.uid} style={styles.leaderRow}>
                      <Text style={{ width: 24, color: i === 0 ? colors.primaryDark : colors.inkFaint, fontWeight: "800" }}>{i + 1}</Text>
                      <Ionicons name="trophy" size={16} color={i === 0 ? colors.primaryDark : colors.inkFaint} />
                      <Text style={{ color: colors.ink, flex: 1, marginLeft: 10, fontWeight: entry.uid === uid ? "800" : "400" }}>
                        {entry.displayName}
                      </Text>
                      <Text style={{ color: colors.inkSoft, fontSize: 12.5 }}>{entry.points} pts</Text>
                    </View>
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
  row: { flexDirection: "row", alignItems: "center" },
  friendRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  leaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
