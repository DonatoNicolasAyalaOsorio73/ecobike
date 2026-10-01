import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import BackgroundBlobs from "@/components/ui/BackgroundBlobs";
import BackButton from "@/components/ui/BackButton";
import GlassSurface from "@/components/ui/GlassSurface";
import { useTheme } from "@/theme/useTheme";
import { useAuthStore } from "@/stores/authStore";
import { useDemoChatStore } from "@/stores/demoChatStore";
import { fetchPublicProfiles } from "@/services/social.service";
import { markChatRead, sendMessage, subscribeMessages, subscribeOtherUnread, type ChatMessage } from "@/services/chat.service";
import { DEMO_FRIENDS } from "@/utils/demoData";

const MAX = 1000;

type Row = { kind: "day"; id: string; label: string } | ({ kind: "msg" } & ChatMessage);

function dayLabel(ts: number) {
  const d = new Date(ts);
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  return format(d, "d 'de' MMMM", { locale: es });
}

export default function ChatScreen() {
  const { colors } = useTheme();
  const { uid: other } = useLocalSearchParams<{ uid: string }>();
  const me = useAuthStore((s) => s.firebaseUser?.uid);
  const isDemo = !me || other?.startsWith("demo_");
  const demo = useDemoChatStore();

  const [remote, setRemote] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [otherUnread, setOtherUnread] = useState<number | null>(null);
  const [name, setName] = useState(DEMO_FRIENDS.find((f) => f.uid === other)?.displayName ?? "");
  const listRef = useRef<FlatList<Row>>(null);

  useEffect(() => {
    if (!other) return;
    if (isDemo) {
      demo.markRead(other);
      return;
    }
    fetchPublicProfiles([other]).then(([p]) => p && setName(p.displayName)).catch(() => {});
    const unsubSeen = subscribeOtherUnread(me!, other, setOtherUnread);
    markChatRead(other);
    const unsubMessages = subscribeMessages(
      me!,
      other,
      (msgs) => {
        setRemote(msgs);
        // A message the server confirmed replaces its optimistic copy.
        setPending((p) => p.filter((x) => !msgs.some((m) => m.fromMe && m.text === x.text)));
        markChatRead(other);
      },
      () => setRemote([]) // chat doc doesn't exist yet (first message not sent)
    );
    return () => {
      unsubMessages();
      unsubSeen();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other, me, isDemo]);

  const messages = isDemo ? demo.chats[other ?? ""] ?? [] : [...remote, ...pending];

  // Day separators between messages from different days.
  const rows = useMemo(() => {
    const out: Row[] = [];
    let lastDay = "";
    for (const m of messages) {
      const label = dayLabel(m.createdAt);
      if (label !== lastDay) out.push({ kind: "day", id: `day_${m.createdAt}`, label });
      lastDay = label;
      out.push({ kind: "msg", ...m });
    }
    return out;
  }, [messages]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [rows.length]);

  const last = messages[messages.length - 1];
  const seen = !isDemo && !!last?.fromMe && !last.pending && otherUnread === 0;

  const onSend = async () => {
    const t = text.trim();
    if (!t || !other) return;
    setText("");
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (isDemo) return demo.send(other, t);
    const optimistic: ChatMessage = { id: `local_${Date.now()}`, fromMe: true, text: t, createdAt: Date.now(), pending: true };
    setPending((p) => [...p, optimistic]);
    try {
      await sendMessage(other, t);
    } catch (e: any) {
      setPending((p) => p.filter((x) => x.id !== optimistic.id));
      setText(t);
      setError(e?.message ?? "No se pudo enviar.");
    }
  };

  return (
    <View style={styles.screen}>
      <BackgroundBlobs />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <BackButton />
          <View style={[styles.avatar, { backgroundColor: colors.glassGreenFill, borderColor: colors.glassGreenBorder }]}>
            <Text style={{ color: colors.primaryDark, fontWeight: "700" }}>{(name || "?").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontWeight: "700", fontSize: 16 }} numberOfLines={1} accessibilityRole="header">
              {name || "Chat"}
            </Text>
            {isDemo && <Text style={{ color: colors.inkFaint, fontSize: 11.5 }}>Conversación de demostración</Text>}
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => r.id}
            contentContainerStyle={styles.list}
            ListFooterComponent={
              seen ? (
                <Animated.Text entering={FadeInUp.springify()} style={[styles.seen, { color: colors.inkFaint }]}>
                  Visto
                </Animated.Text>
              ) : null
            }
            ListEmptyComponent={
              <Text style={{ color: colors.inkSoft, textAlign: "center", marginTop: 40 }}>Escribe el primer mensaje. Solo tus amigos pueden escribirte.</Text>
            }
            renderItem={({ item }) =>
              item.kind === "day" ? (
                <Text style={[styles.day, { color: colors.inkFaint }]}>{item.label}</Text>
              ) : (
                <Animated.View entering={FadeInUp.duration(220)} style={[styles.bubbleRow, item.fromMe ? styles.right : styles.left]}>
                  <View
                    style={[
                      styles.bubble,
                      item.fromMe
                        ? { backgroundColor: SENT, borderBottomRightRadius: 6 }
                        : { backgroundColor: RECEIVED, borderBottomLeftRadius: 6 },
                      item.pending && { opacity: 0.6 },
                    ]}
                  >
                    <Text selectable style={{ color: item.fromMe ? "#1C2410" : colors.ink, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 }}>
                      {item.text}
                    </Text>
                    <Text style={[styles.time, { color: item.fromMe ? "rgba(28,36,16,0.6)" : colors.inkFaint }]}>
                      {item.pending ? "Enviando…" : format(new Date(item.createdAt), "HH:mm")}
                    </Text>
                  </View>
                </Animated.View>
              )
            }
          />

          {error && (
            <Text style={{ color: colors.danger, textAlign: "center", marginBottom: 6 }} accessibilityLiveRegion="assertive">
              {error}
            </Text>
          )}

          <GlassSurface radius={26} intensity={60} backgroundColor={colors.glassFillStrong} style={styles.composer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Mensaje"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, { color: colors.ink }]}
              multiline
              maxLength={MAX}
              accessibilityLabel="Escribe un mensaje"
              onSubmitEditing={onSend}
              blurOnSubmit={false}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar"
              onPress={onSend}
              disabled={!text.trim()}
              style={[styles.send, { backgroundColor: text.trim() ? SENT : colors.divider }]}
            >
              <Ionicons name="arrow-up" size={20} color="#1C2410" />
            </Pressable>
          </GlassSurface>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// iMessage-style bubbles in the app green.
const SENT = "#ADF14B";
const RECEIVED = "#E9EFE8";

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  list: { paddingHorizontal: 14, paddingVertical: 10, flexGrow: 1 },
  day: { textAlign: "center", fontSize: 11.5, fontWeight: "700", marginVertical: 10 },
  bubbleRow: { marginVertical: 3, maxWidth: "82%" },
  left: { alignSelf: "flex-start" },
  right: { alignSelf: "flex-end" },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  seen: { alignSelf: "flex-end", fontSize: 11.5, fontWeight: "700", marginTop: 2, marginRight: 6 },
  time: { fontSize: 10.5, marginTop: 3, alignSelf: "flex-end", opacity: 0.75 },
  composer: { flexDirection: "row", alignItems: "flex-end", marginHorizontal: 12, marginBottom: 8, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, fontSize: 15.5, maxHeight: 120, paddingVertical: 8 },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", marginLeft: 6 },
});
