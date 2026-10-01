import { collection, doc, limit, onSnapshot, orderBy, query, where, type Unsubscribe } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { api } from "./api";

export interface ChatSummary {
  id: string;
  otherUid: string;
  lastText: string;
  lastFromMe: boolean;
  updatedAt: number;
  unread: number;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  createdAt: number;
  /** Optimistic message not yet confirmed by the server. */
  pending?: boolean;
}

/** Same id the server uses (api/_lib.js chatIdFor). */
export function chatIdFor(a: string, b: string): string {
  return [a, b].sort().join("__");
}

const millis = (t: any) => (typeof t?.toMillis === "function" ? t.toMillis() : Date.now());

/** Live list of my conversations, most recent first. */
export function subscribeChats(me: string, cb: (chats: ChatSummary[]) => void, onError?: (e: Error) => void): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};
  const q = query(collection(getDb(), "chats"), where("participants", "array-contains", me), orderBy("updatedAt", "desc"), limit(50));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            otherUid: (data.participants as string[]).find((p) => p !== me) ?? me,
            lastText: data.lastMessage?.text ?? "",
            lastFromMe: data.lastMessage?.from === me,
            updatedAt: millis(data.updatedAt),
            unread: data.unread?.[me] ?? 0,
          };
        })
      ),
    onError
  );
}

/** Live messages of one chat (latest 200, oldest first). */
export function subscribeMessages(me: string, other: string, cb: (msgs: ChatMessage[]) => void, onError?: (e: Error) => void): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};
  const q = query(collection(doc(getDb(), "chats", chatIdFor(me, other)), "messages"), orderBy("createdAt", "desc"), limit(200));
  return onSnapshot(
    q,
    (snap) =>
      cb(
        snap.docs
          .map((d) => ({ id: d.id, fromMe: d.data().from === me, text: d.data().text as string, createdAt: millis(d.data().createdAt) }))
          .reverse()
      ),
    onError
  );
}

export function sendMessage(to: string, text: string) {
  return api<{ id: string }>("messages", "POST", { action: "send", to, text });
}

export function markChatRead(other: string) {
  return api("messages", "POST", { action: "read", with: other }).catch(() => {});
}

/** Live unread count of the other participant (0 = they've read everything → "Visto"). */
export function subscribeOtherUnread(me: string, other: string, cb: (unread: number | null) => void): Unsubscribe {
  if (!isFirebaseConfigured) return () => {};
  return onSnapshot(
    doc(getDb(), "chats", chatIdFor(me, other)),
    (snap) => cb(snap.exists() ? (snap.data().unread?.[other] ?? 0) : null),
    () => cb(null)
  );
}
