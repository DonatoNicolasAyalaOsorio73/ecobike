import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import GlassCard from "@/components/ui/GlassCard";
import GlassInput from "@/components/ui/GlassInput";
import GlassButton from "@/components/ui/GlassButton";
import SegmentedControl from "@/components/ui/SegmentedControl";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useDemoChatStore } from "@/stores/demoChatStore";
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
import { subscribeChats, type ChatSummary } from "@/services/chat.service";
import { DEMO_FRIENDS } from "@/utils/demoData";
import type { UserProfile } from "@/types/user";

type Tab = "messages" | "friends" | "ranking";

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
  const isGuest = !uid;
  const demoChats = useDemoChatStore();

  const [tab, setTab] = useState<Tab>("messages");
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<UserProfile | null | undefined>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<PublicProfile[]>([]);
  const [friends, setFriends] = useState<PublicProfile[]>(isGuest ? DEMO_FRIENDS.map((f) => ({ ...f, photoURL: null })) : []);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [names, setNames] = useState<Record<string, PublicProfile>>({});
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoadError(null);
    try {
      const [incoming, friendUids] = await Promise.all([listIncomingFriendRequests(uid), listFriendUids(uid)]);
      const [req, fr] = await Promise.all([fetchPublicProfiles(incoming.map((r) => r.from)), fetchPublicProfiles(friendUids)]);
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

  // Live conversation list.
  useEffect(() => {
    if (!uid) return;
    return subscribeChats(uid, setChats, () => setChats([]));
  }, [uid]);

  // Names/photos for chat partners that aren't in the friends list (e.g. ex-friends).
  useEffect(() => {
    const known = new Set([...friends.map((f) => f.uid), ...Object.keys(names)]);
    const missing = chats.map((c) => c.otherUid).filter((u) => !known.has(u));
    if (missing.length) fetchPublicProfiles(missing).then((ps) => setNames((n) => ({ ...n, ...Object.fromEntries(ps.map((p) => [p.uid, p])) })));
  }, [chats, friends, names]);

  const profileOf = (u: string): PublicProfile | undefined => friends.find((f) => f.uid === u) ?? names[u];

  const conversations: ChatSummary[] = useMemo(() => {
    if (!isGuest) return chats;
    return Object.entries(demoChats.chats)
      .map(([other, msgs]) => {
        const last = msgs[msgs.length - 1];
        return { id: other, otherUid: other, lastText: last?.text ?? "", lastFromMe: !!last?.fromMe, updatedAt: last?.createdAt ?? 0, unread: demoChats.unread[other] ?? 0 };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [isGuest, chats, demoChats.chats, demoChats.unread]);
  const unreadTotal = conversations.reduce((s, c) => s + c.unread, 0);

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
  const myPoints = me?.puntosAcumulados ?? 0;
  const ranking = [
    ...friends,
    { uid: uid ?? "me", displayName: `${me?.displayName ?? "Tú"} (tú)`, username: me?.username ?? "", photoURL: me?.photoURL ?? null, points: isGuest ? 2400 : myPoints },
  ].sort((a, b) => b.points - a.points);

  if (!isFirebaseConfigured) {
    return (
      <View style={styles.screen}>
        <BackgroundBlobs />
        <SafeAreaView style={styles.safe} edges={["top"]}>
          <Text style={[styles.header, { color: colors.ink }]}>Amigos</Text>
          <View style={{ padding: 20 }}>
            <GlassCard>
              <Text style={{ color: colors.inkSoft, textAlign: "center" }}>La función de amigos necesita conexión con el servidor.</Text>
            </GlassCard>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
          <Text style={[styles.header, { color: colors.ink }]} accessibilityRole="header">
            Amigos
          </Text>
          {requests.length > 0 && (
            <Animated.View entering={ZoomIn.springify()} style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{requests.length} solicitud{requests.length > 1 ? "es" : ""}</Text>
            </Animated.View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <SegmentedControl
            options={[
              { label: unreadTotal ? `Mensajes (${unreadTotal})` : "Mensajes", value: "messages" },
              { label: "Amigos", value: "friends" },
              { label: "Ranking", value: "ranking" },
            ]}
            value={tab}
            onChange={setTab}
            style={{ marginBottom: 14 }}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={uid ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {isGuest && (
            <GlassCard style={{ marginBottom: 12 }}>
              <Text style={{ color: colors.inkSoft, fontSize: 13, textAlign: "center" }}>
                Estás explorando sin cuenta: amigos y mensajes de ejemplo. Inicia sesión para agregar a tus amigos reales.
              </Text>
            </GlassCard>
          )}

          {loadError && (
            <GlassCard style={{ marginBottom: 12, alignItems: "center" }}>
              <Ionicons name="cloud-offline-outline" size={22} color={colors.inkSoft} />
              <Text style={{ color: colors.inkSoft, textAlign: "center", marginTop: 6, marginBottom: 12 }}>{loadError}</Text>
              <GlassButton label="Reintentar" icon="refresh" variant="secondary" onPress={load} />
            </GlassCard>
          )}

          {tab === "messages" && (
            <GlassCard>
              {conversations.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 12 }}>
                  <Ionicons name="chatbubbles-outline" size={30} color={colors.inkFaint} />
                  <Text style={{ color: colors.inkSoft, textAlign: "center", marginTop: 8 }}>
                    Aún no tienes conversaciones. Escríbele a un amigo desde la pestaña Amigos.
                  </Text>
                </View>
              ) : (
                conversations.map((c, i) => {
                  const p = profileOf(c.otherUid);
                  const name = p?.displayName ?? "Usuario";
                  return (
                    <Animated.View key={c.id} entering={FadeInUp.delay(i * 35).springify().damping(18)}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Chat con ${name}${c.unread ? `, ${c.unread} sin leer` : ""}`}
                        onPress={() => router.push(`/chat/${c.otherUid}`)}
                        style={({ pressed }) => [styles.chatRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}
                      >
                        <Avatar label={name} photoURL={p?.photoURL} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={styles.chatTop}>
                            <Text style={{ color: colors.ink, fontWeight: c.unread ? "800" : "700", flex: 1 }} numberOfLines={1}>
                              {name}
                            </Text>
                            {c.updatedAt > 0 && (
                              <Text style={{ color: colors.inkFaint, fontSize: 11.5 }}>
                                {formatDistanceToNowStrict(new Date(c.updatedAt), { locale: es })}
                              </Text>
                            )}
                          </View>
                          <View style={styles.chatTop}>
                            <Text style={{ color: c.unread ? colors.ink : colors.inkSoft, fontSize: 13, flex: 1 }} numberOfLines={1}>
                              {c.lastFromMe ? "Tú: " : ""}
                              {c.lastText}
                            </Text>
                            {c.unread > 0 && (
                              <View style={[styles.unread, { backgroundColor: colors.primary }]}>
                                <Text style={{ color: colors.onPrimary, fontSize: 11, fontWeight: "800" }}>{c.unread}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
            </GlassCard>
          )}

          {tab === "friends" && (
            <>
              {!isGuest && (
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
                    <Text style={{ color: colors.inkFaint, fontSize: 12, marginTop: 10, textAlign: "center" }}>Tu usuario: @{me.username}</Text>
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
              )}

              {requests.length > 0 && uid && (
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
                  <Text style={{ color: colors.inkSoft, textAlign: "center", paddingVertical: 8 }}>Todavía no tienes amigos. Búscalos por su nombre de usuario.</Text>
                ) : (
                  friends.map((f, i) => {
                    const confirming = confirmRemove === f.uid;
                    return (
                      <Animated.View key={f.uid} entering={FadeInUp.duration(360).delay(i * 40).springify().damping(18)} style={styles.friendRow}>
                        <Avatar label={f.displayName} photoURL={f.photoURL} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={{ color: colors.ink, fontWeight: "600" }}>{f.displayName}</Text>
                          <Text style={{ color: colors.inkSoft, fontSize: 12 }}>
                            @{f.username} · {f.points.toLocaleString("es-CO")} pts
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Escribir a ${f.displayName}`}
                          hitSlop={8}
                          onPress={() => router.push(`/chat/${f.uid}`)}
                          style={[styles.pill, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder, marginRight: 8 }]}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primaryDark} />
                        </Pressable>
                        {!isGuest && uid && (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={confirming ? `Confirmar eliminar a ${f.displayName}` : `Eliminar a ${f.displayName}`}
                            hitSlop={8}
                            onPress={() =>
                              confirming ? run(`rm-${f.uid}`, () => removeFriend(uid, f.uid)).then(() => setConfirmRemove(null)) : setConfirmRemove(f.uid)
                            }
                            style={[
                              styles.pill,
                              confirming
                                ? { backgroundColor: "rgba(229,72,77,0.12)", borderColor: colors.danger }
                                : { backgroundColor: colors.glassFillStrong, borderColor: colors.glassBorder },
                            ]}
                          >
                            <Ionicons name={confirming ? "trash" : "person-remove-outline"} size={14} color={confirming ? colors.danger : colors.inkSoft} />
                            {confirming && <Text style={{ color: colors.danger, fontSize: 11.5, fontWeight: "700", marginLeft: 4 }}>Eliminar</Text>}
                          </Pressable>
                        )}
                      </Animated.View>
                    );
                  })
                )}
              </GlassCard>
            </>
          )}

          {tab === "ranking" && (
            <>
              {friends.length === 0 ? (
                <GlassCard>
                  <Text style={{ color: colors.inkSoft, textAlign: "center", paddingVertical: 8 }}>Agrega amigos para comparar progreso.</Text>
                </GlassCard>
              ) : (
                <>
                  <View style={styles.podium}>
                    {[1, 0, 2].map((pos) => {
                      const e = ranking[pos];
                      if (!e) return <View key={pos} style={{ flex: 1 }} />;
                      const h = pos === 0 ? 130 : pos === 1 ? 100 : 80;
                      return (
                        <Animated.View key={e.uid} entering={FadeInUp.delay(120 + pos * 90).springify().damping(14)} style={styles.podiumCol}>
                          <Avatar label={e.displayName} photoURL={e.photoURL} size={pos === 0 ? 58 : 48} />
                          <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 12.5, marginTop: 6 }} numberOfLines={1}>
                            {e.displayName.replace(" (tú)", "")}
                          </Text>
                          <Text style={{ color: colors.inkSoft, fontSize: 11.5 }}>{e.points.toLocaleString("es-CO")} pts</Text>
                          <View style={[styles.podiumBar, { height: h, backgroundColor: pos === 0 ? colors.primary : colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
                            <Text style={{ color: pos === 0 ? colors.onPrimary : colors.primaryDark, fontWeight: "800", fontSize: 22 }}>{pos + 1}</Text>
                          </View>
                        </Animated.View>
                      );
                    })}
                  </View>
                  <GlassCard>
                    {ranking.map((entry, i) => (
                      <View key={entry.uid} style={styles.leaderRow}>
                        <Text style={{ width: 26, color: i < 3 ? colors.primaryDark : colors.inkFaint, fontWeight: "800" }}>{i + 1}</Text>
                        <Avatar label={entry.displayName} photoURL={entry.photoURL} size={32} />
                        <Text style={{ color: colors.ink, flex: 1, marginLeft: 10, fontWeight: entry.displayName.endsWith("(tú)") ? "800" : "500" }} numberOfLines={1}>
                          {entry.displayName}
                        </Text>
                        <Text style={{ color: colors.inkSoft, fontSize: 12.5 }}>{entry.points.toLocaleString("es-CO")} pts</Text>
                      </View>
                    ))}
                  </GlassCard>
                </>
              )}
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8, marginBottom: 12 },
  header: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 11.5, fontWeight: "800" },
  scroll: { paddingHorizontal: 20 },
  sectionLabel: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8, marginTop: 18 },
  resultRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 10 },
  row: { flexDirection: "row", alignItems: "center" },
  friendRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  chatRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  chatTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  unread: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  leaderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  podium: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 16 },
  podiumCol: { flex: 1, alignItems: "center" },
  podiumBar: { width: "100%", borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 8 },
});
