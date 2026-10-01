import { create } from "zustand";
import { DEMO_CHATS } from "@/utils/demoData";
import type { ChatMessage } from "@/services/chat.service";

// Guest-mode chat: lives only in memory on this device, so the demo can show
// the real chat UI without an account. Friends "reply" with a canned line.
const REPLIES = ["¡Genial!", "Dale, nos vemos allá", "Hoy llevo 12 km, ¿y tú?", "Jajaja, buenísimo", "¿Mañana a la misma hora?"];

function seed(): Record<string, ChatMessage[]> {
  const now = Date.now();
  const out: Record<string, ChatMessage[]> = {};
  for (const [uid, msgs] of Object.entries(DEMO_CHATS)) {
    out[uid] = msgs.map((m, i) => ({ id: `${uid}_${i}`, fromMe: m.from === "me", text: m.text, createdAt: now - m.minutesAgo * 60_000 }));
  }
  return out;
}

interface DemoChatState {
  chats: Record<string, ChatMessage[]>;
  unread: Record<string, number>;
  send: (to: string, text: string) => void;
  markRead: (uid: string) => void;
}

export const useDemoChatStore = create<DemoChatState>((set, get) => ({
  chats: seed(),
  unread: { demo_friend_andres: 1 },
  send: (to, text) => {
    const msg: ChatMessage = { id: `${to}_${Date.now()}`, fromMe: true, text, createdAt: Date.now() };
    set({ chats: { ...get().chats, [to]: [...(get().chats[to] ?? []), msg] } });
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `${to}_r${Date.now()}`,
        fromMe: false,
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        createdAt: Date.now(),
      };
      set({ chats: { ...get().chats, [to]: [...(get().chats[to] ?? []), reply] } });
    }, 1400);
  },
  markRead: (uid) => set({ unread: { ...get().unread, [uid]: 0 } }),
}));
